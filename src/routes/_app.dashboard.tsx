import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Layers, Plus, Sparkles, Zap, TrendingUp, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getIcon } from "@/lib/icons";
import { ensureStarterCategories } from "@/lib/starter-categories";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { computeCoachStats } from "@/lib/coach";
import { useCountUp } from "@/lib/use-count-up";
import { logActivity } from "@/lib/activity";

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
      const [items, cats, acts] = await Promise.all([
        supabase.from("items").select("*").eq("user_id", user!.id),
        supabase.from("categories").select("*").eq("user_id", user!.id),
        supabase.from("activities").select("*").eq("user_id", user!.id)
          .order("created_at", { ascending: false }).limit(100),
      ]);
      const total = items.data?.length ?? 0;
      const completed = items.data?.filter((i) => i.completed).length ?? 0;
      const coach = computeCoachStats(items.data ?? [], cats.data ?? [], acts.data ?? []);
      return {
        total,
        completed,
        pending: total - completed,
        categories: cats.data?.length ?? 0,
        pct: total ? Math.round((completed / total) * 100) : 0,
        coach,
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
        .limit(8);
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
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
            {greeting}, {profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there"}
            <Sun className="h-6 w-6 shrink-0 text-primary md:h-7 md:w-7" />
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

      <TodaysFocus userId={user?.id} />

      {stats?.coach && (
        <section className="grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card md:col-span-2">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-primary/30 bg-background text-xl font-bold text-primary">
                {stats.coach.score}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Productivity score</p>
                <p className="text-lg font-semibold">
                  {stats.coach.score >= 75 ? "On fire" : stats.coach.score >= 40 ? "Steady" : "Warming up"}
                </p>
                <Progress value={stats.coach.score} className="mt-2 h-1.5" />
              </div>
              <Link to="/coach" className="hidden sm:block">
                <Button variant="outline" size="sm"><Sparkles className="mr-1 h-3.5 w-3.5" /> Coach</Button>
              </Link>
            </CardContent>
          </Card>
          <StatCard label="Today" value={stats.coach.todayCompleted} icon={Zap} tint="primary" />
          <StatCard label="This week" value={stats.coach.weekCompleted} icon={TrendingUp} tint="success" />
        </section>
      )}

      {stats?.coach && (stats.coach.activeGoals + stats.coach.activeHabits + stats.coach.learningDone + stats.coach.jobsApplied + stats.coach.certificationsEarned > 0) && (
        <section className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <MiniMetric label="Active goals" value={stats.coach.activeGoals} />
          <MiniMetric label="Active habits" value={stats.coach.activeHabits} />
          <MiniMetric label="Learning done" value={stats.coach.learningDone} />
          <MiniMetric label="Jobs applied" value={stats.coach.jobsApplied} />
          <MiniMetric label="Certifications" value={stats.coach.certificationsEarned} />
        </section>
      )}

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

      {stats?.coach && stats.coach.perCategory.some((c) => c.total > 0) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Your coach has new insights</p>
                <p className="text-sm text-muted-foreground">
                  {stats.coach.mostActive ? `${stats.coach.mostActive.name} is your top area this week.` : "Personalized recommendations are ready."}
                  {stats.coach.leastActive ? ` ${stats.coach.leastActive.name} needs attention.` : ""}
                </p>
              </div>
            </div>
            <Link to="/coach"><Button className="bg-gradient-primary">Open AI Coach <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>
      )}

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
                    <Card className="cat-card border-border bg-card" style={{ "--cat": c.color } as React.CSSProperties}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${c.color}22`, color: c.color }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold">{c.name}</h3>
                            <p className="text-xs text-muted-foreground">{done}/{total} done</p>
                            <Progress value={pct} className="progress-cat progress-fill mt-2 h-1.5" />
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

function TodaysFocus({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  // Guards against double-firing while a check-in is in flight.
  const pending = useRef(new Set<string>());

  const { data: focus } = useQuery({
    queryKey: ["today-focus", userId, todayKey],
    enabled: !!userId,
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("id,name,color").eq("user_id", userId!);
      const habitsCat = (cats ?? []).find((c) => c.name.trim().toLowerCase() === "habits");
      const goalsCat = (cats ?? []).find((c) => c.name.trim().toLowerCase() === "daily goals");
      const catIds = [habitsCat?.id, goalsCat?.id].filter(Boolean) as string[];
      if (!catIds.length) return { habits: [] as any[], goals: [] as any[] };
      const { data: items } = await supabase.from("items").select("*").in("category_id", catIds);
      const habitItems = (items ?? []).filter((i: any) => i.category_id === habitsCat?.id);
      const goalItems = (items ?? []).filter(
        (i: any) => i.category_id === goalsCat?.id && !i.completed &&
          (i.is_recurring || format(new Date(i.created_at), "yyyy-MM-dd") === todayKey),
      );
      const { data: logs } = habitItems.length
        ? await supabase.from("habit_logs").select("item_id").in("item_id", habitItems.map((h: any) => h.id)).eq("log_date", todayKey)
        : { data: [] as any[] };
      const loggedIds = new Set((logs ?? []).map((l: any) => l.item_id));
      return {
        habits: habitItems.filter((h: any) => !loggedIds.has(h.id)),
        goals: goalItems,
        habitsCatId: habitsCat?.id,
        goalsCatId: goalsCat?.id,
      };
    },
  });

  if (!focus || (!focus.habits.length && !focus.goals.length)) return null;

  async function completeHabit(item: any) {
    if (!userId || pending.current.has(item.id)) return;
    pending.current.add(item.id);
    // Optimistic: remove it from the list instantly; restore if the write fails.
    qc.setQueryData<any>(["today-focus", userId, todayKey], (old) => old && ({
      ...old,
      habits: old.habits.filter((h: any) => h.id !== item.id),
    }));
    const { error } = await supabase.from("habit_logs").insert({ user_id: userId, item_id: item.id, log_date: todayKey });
    if (error) {
      qc.invalidateQueries({ queryKey: ["today-focus"] });
      toast.error(error.message);
      pending.current.delete(item.id);
      return;
    }
    void logActivity({ userId, action: "completed", entityType: "item", entityId: item.id, entityTitle: item.title, categoryId: (focus as any).habitsCatId, categoryName: "Habits" });
    toast.success(`Nice! "${item.title}" logged`);
    qc.invalidateQueries({ queryKey: ["today-focus"] });
    qc.invalidateQueries({ queryKey: ["habit-logs"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    pending.current.delete(item.id);
  }

  async function completeGoal(item: any) {
    if (!userId || pending.current.has(item.id)) return;
    pending.current.add(item.id);
    // Optimistic: remove it from the list instantly; restore if the write fails.
    qc.setQueryData<any>(["today-focus", userId, todayKey], (old) => old && ({
      ...old,
      goals: old.goals.filter((g: any) => g.id !== item.id),
    }));
    const { error } = await supabase.from("items").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", item.id);
    if (error) {
      qc.invalidateQueries({ queryKey: ["today-focus"] });
      toast.error(error.message);
      pending.current.delete(item.id);
      return;
    }
    void logActivity({ userId, action: "completed", entityType: "item", entityId: item.id, entityTitle: item.title, categoryId: (focus as any).goalsCatId, categoryName: "Daily Goals" });
    toast.success(`Done: "${item.title}"`);
    qc.invalidateQueries({ queryKey: ["today-focus"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    pending.current.delete(item.id);
  }

  return (
    <Card className="border-primary/30 bg-gradient-surface">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Today's focus</h3>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            {focus.habits.length + focus.goals.length} left
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {focus.habits.map((h: any) => (
            <div key={h.id} className="item-in flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
              <span className="min-w-0 truncate text-sm">{h.title}</span>
              <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1 hover:border-success/60 hover:text-success" onClick={() => completeHabit(h)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Log
              </Button>
            </div>
          ))}
          {focus.goals.map((g: any) => (
            <div key={g.id} className="item-in flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
              <span className="min-w-0 truncate text-sm">{g.title}</span>
              <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1 hover:border-success/60 hover:text-success" onClick={() => completeGoal(g)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Done
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: number; icon: any; tint: "primary" | "success" | "warning" }) {
  const map = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };
  const display = useCountUp(value);
  return (
    <Card className="card-lift group border-border bg-gradient-surface hover:border-primary/40">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="label-bright">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{display}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${map[tint]}`}>
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

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}