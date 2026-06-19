import { supabase } from "@/integrations/supabase/client";

export type ActivityAction = "created" | "completed" | "uncompleted" | "updated" | "deleted";

export async function logActivity(opts: {
  userId: string;
  action: ActivityAction;
  entityType: "item" | "category";
  entityId?: string;
  entityTitle?: string;
  categoryId?: string;
  categoryName?: string;
}) {
  await supabase.from("activities").insert({
    user_id: opts.userId,
    action: opts.action,
    entity_type: opts.entityType,
    entity_id: opts.entityId,
    entity_title: opts.entityTitle,
    category_id: opts.categoryId,
    category_name: opts.categoryName,
  });
}