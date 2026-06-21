import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Layers, Plus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getIcon } from "@/lib/icons";
import { ensureStarterCategories } from "@/lib/starter-categories";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CtrlTrack" }] }),
  component: Dashboard,
});

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Dashboard() {
  const { user } = useAuth();
  const now = useNow();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  async function setupStarters() {
    if (!user) return;
    setSeeding(true);
    try {
      const n = await ensureStarterCategories(user.id);
      if (n === 0) toast.info("All starter categories already exist.");
      else toast.success(`Added ${n} starter ${n === 1 ? "category" : "categories"}.`);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["categories-full"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to set up starter categories");
    } finally {
      setSeeding(false);
    }
  }

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [items, cats] = await Promise.all([
        supabase.from("items").select("id,completed").eq("user_id", user!.id),
        supabase.from("categories").select("id").eq("user_id", user!.id),
      ]);
      const total = items.data?.length ?? 0;
      const completed = items.data?.filter((i) => i.completed).length ?? 0;
      return {
        total,
        completed,
        pending: total - completed,
        categories: cats.data?.length ?? 0,
        pct: total ? Math.round((completed / total) * 100) : 0,
      };
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,icon,color, items(id,completed)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities", user?.id, "recent"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
            {greeting}, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Here's your command center at a glance.</p>
        </div>
        <Link to="/categories">
          <Button className="bg-gradient-primary shadow-elegant">
            <Plus className="mr-1 h-4 w-4" /> New category
          </Button>
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Categories" value={stats?.categories ?? 0} icon={Layers} tint="primary" />
        <StatCard label="Total items" value={stats?.total ?? 0} icon={Sparkles} tint="primary" />
        <StatCard label="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} tint="success" />
        <StatCard label="Pending" value={stats?.pending ?? 0} icon={Clock} tint="warning" />
      </section>

      <Card className="border-border bg-gradient-surface">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Overall progress</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.completed ?? 0} of {stats?.total ?? 0} items completed
              </p>
            </div>
            <span className="text-3xl font-bold text-primary">{stats?.pct ?? 0}%</span>
          </div>
          <Progress value={stats?.pct ?? 0} className="mt-4 h-2" />
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your categories</h2>
            <Link to="/categories" className="text-sm text-primary hover:underline">
              View all <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          {!categories?.length ? (
            <Card className="border-dashed border-border bg-transparent">
              <CardContent className="mx-auto grid max-w-md place-items-center gap-3 p-10 text-center">
                <Sparkles className="h-7 w-7 text-primary" />
                <h3 className="font-semibold">Build your command center</h3>
                <p className="text-sm text-muted-foreground">
                  Get started instantly with 8 ready-made categories covering jobs, learning,
                  goals, habits, fitness and more.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={setupStarters} disabled={seeding} className="bg-gradient-primary">
                    <Sparkles className="mr-1 h-4 w-4" /> {seeding ? "Setting up…" : "Setup Starter Categories"}
                  </Button>
                  <Link to="/categories"><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Create custom</Button></Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((c: any) => {
                const total = c.items?.length ?? 0;
                const done = c.items?.filter((i: any) => i.completed).length ?? 0;
                const pct = total ? Math.round((done / total) * 100) : 0;
                const Icon = getIcon(c.icon);
                return (
                  <Link key={c.id} to="/categories/$id" params={{ id: c.id }}>
                    <Card className="border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${c.color}22`, color: c.color }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold">{c.name}</h3>
                            <p className="text-xs text-muted-foreground">{done}/{total} done</p>
                            <Progress value={pct} className="mt-2 h-1.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
          <Card className="border-border bg-card">
            <CardContent className="divide-y divide-border p-0">
              {!activities?.length ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Nothing yet — your actions will appear here.</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 text-sm">
                    <ActivityDot action={a.action} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate"><span className="capitalize text-muted-foreground">{a.action}</span> <span className="font-medium">{a.entity_title}</span></p>
                      <p className="text-xs text-muted-foreground">{a.category_name ?? a.entity_type} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: number; icon: any; tint: "primary" | "success" | "warning" }) {
  const map = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${map[tint]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityDot({ action }: { action: string }) {
  const color =
    action === "completed" ? "bg-success" :
    action === "deleted" ? "bg-destructive" :
    action === "updated" ? "bg-warning" :
    "bg-primary";
  return <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}