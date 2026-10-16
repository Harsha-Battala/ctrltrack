import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Activity as ActivityIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity — CtrlTrack" }] }),
  component: ActivityFeed,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "completed", label: "Completed" },
  { id: "deleted", label: "Deleted" },
] as const;

const PAGE_SIZE = 20;

function ActivityFeed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [shown, setShown] = useState(PAGE_SIZE);

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

  const filtered = useMemo(
    () => (filter === "all" ? activities : activities.filter((a) => a.action === filter)),
    [activities, filter],
  );
  const visible = filtered.slice(0, shown);

  const groups = useMemo(() => {
    const g: { label: string; items: typeof visible }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Earlier", items: [] },
    ];
    visible.forEach((a) => {
      const d = new Date(a.created_at);
      if (isToday(d)) g[0]!.items.push(a);
      else if (isYesterday(d)) g[1]!.items.push(a);
      else g[2]!.items.push(a);
    });
    return g.filter((x) => x.items.length > 0);
  }, [visible]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={ActivityIcon}
        eyebrow="Overview"
        title="Activity"
        description="Everything you've done, in one timeline."
        actions={
          activities.length > 0 ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              {activities.length} events
            </span>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setShown(PAGE_SIZE); }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === f.id
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <Card className="border-dashed border-border bg-transparent">
          <CardContent className="grid place-items-center gap-2 p-12 text-center">
            <ActivityIcon className="h-7 w-7 text-primary" />
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No activity yet — create a category or complete an item to see it here."
                : `No "${filter}" events yet.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <p className="label-bright mb-2">{g.label}</p>
              <Card className="border-border bg-card">
                <CardContent className="divide-y divide-border p-0">
                  {g.items.map((a) => (
                    <div key={a.id} className="item-in flex items-start gap-3 p-4">
                      <Dot action={a.action} />
                      <div className="flex-1">
                        <p className="text-sm"><span className="capitalize text-muted-foreground">{a.action}</span>{" "}<span className="font-medium">{a.entity_title}</span></p>
                        <p className="text-xs text-muted-foreground">{a.category_name ?? a.entity_type} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
          {filtered.length > shown && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShown((s) => s + PAGE_SIZE)}>
                Load more ({filtered.length - shown} remaining)
              </Button>
            </div>
          )}
        </div>
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
