import { supabase } from "@/integrations/supabase/client";

export type AgentRecommendation = {
  id: string;
  title: string;
  body: string;
  tone: "positive" | "warning" | "info" | "suggestion";
  priority: "low" | "medium" | "high";
  status: string;
  created_at: string;
};

export type AgentRunResult = {
  summary: string;
  trace: Array<{ name: string; input: Record<string, unknown> }>;
  recommendations: AgentRecommendation[];
};

export async function runAiCoach(): Promise<AgentRunResult> {
  const { data, error } = await supabase.functions.invoke("ai-coach", { method: "POST" });
  if (error) throw error;
  return data as AgentRunResult;
}
