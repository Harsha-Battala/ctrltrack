import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity — CtrlTrack" }] }),
  component: ActivityFeed,
});

function ActivityFeed() {
  const { user } = useAuth();
  const { data: activities = [] } = useQuery({
    queryKey: ["activities-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">Everything you've done, in one timeline.</p>
      </div>
      {!activities.length ? (
        <Card className="border-dashed border-border bg-transparent">
          <CardContent className="grid place-items-center p-12 text-center text-muted-foreground">
            No activity yet — create a category or complete an item to see it here.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="divide-y divide-border p-0">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <Dot action={a.action} />
                <div className="flex-1">
                  <p className="text-sm"><span className="capitalize text-muted-foreground">{a.action}</span>{" "}<span className="font-medium">{a.entity_title}</span></p>
                  <p className="text-xs text-muted-foreground">{a.category_name ?? a.entity_type} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Dot({ action }: { action: string }) {
  const color =
    action === "completed" ? "bg-success" :
    action === "deleted" ? "bg-destructive" :
    action === "updated" ? "bg-warning" :
    "bg-primary";
  return <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}