import { supabase } from "@/integrations/supabase/client";

export type StarterCategory = {
  name: string;
  icon: string;
  color: string;
  description: string;
};

export const STARTER_CATEGORIES: StarterCategory[] = [
  { name: "Jobs Applied",   icon: "Briefcase",   color: "#3B82F6", description: "Track job applications and interview progress" },
  { name: "Learning",       icon: "BookOpen",    color: "#A855F7", description: "Track courses, skills, and learning goals" },
  { name: "Certifications", icon: "Award",       color: "#F59E0B", description: "Track completed and ongoing certifications" },
  { name: "Goals",          icon: "Target",      color: "#22C55E", description: "Track personal and professional goals" },
  { name: "Habits",         icon: "Flame",       color: "#F97316", description: "Build consistency through daily habits" },
  { name: "Daily Goals",    icon: "Calendar",    color: "#14B8A6", description: "Plan and complete today's priorities" },
  { name: "Fitness",        icon: "Dumbbell",    color: "#EF4444", description: "Track workouts, health goals, and fitness progress" },
  { name: "General Tasks",  icon: "CheckCircle", color: "#E85D3A", description: "General task management" },
];

export const STARTER_NAMES = STARTER_CATEGORIES.map((c) => c.name);

/**
 * Inserts any missing starter categories for the given user.
 * Skips ones the user already has (matched by name, case-insensitive).
 * Returns the number of categories created.
 */
export async function ensureStarterCategories(userId: string): Promise<number> {
  const { data: existing, error } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId);
  if (error) throw error;

  const have = new Set((existing ?? []).map((c) => c.name.trim().toLowerCase()));
  const toCreate = STARTER_CATEGORIES.filter(
    (c) => !have.has(c.name.toLowerCase()),
  );
  if (!toCreate.length) return 0;

  const rows = toCreate.map((c) => ({
    user_id: userId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    description: c.description,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("categories")
    .insert(rows)
    .select("id");
  if (insertError) {
    // 23505 = unique_violation. Means another concurrent seeder already created them.
    // That's the desired end state, so swallow it.
    if ((insertError as any).code === "23505") return 0;
    throw insertError;
  }
  return inserted?.length ?? 0;
}