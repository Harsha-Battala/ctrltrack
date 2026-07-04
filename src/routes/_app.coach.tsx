import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, BookOpen, Briefcase, Calendar, Flame, ListChecks,
  Repeat, Sparkles, Target, TrendingUp, Award, CheckCircle2, Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { computeCoachStats, generateInsights, type Insight } from "@/lib/coach";
import { getIcon } from "@/lib/icons";

export const Route = createFileRoute("/_app/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — CtrlTrack" },
      { name: "description", content: "Personalized insights and recommendations based on your progress." },
    ],
  }),
  component: CoachPage,
});

const ICONS: Record<string, any> = {
  TrendingUp, Flame, AlertCircle, Briefcase, Calendar, Repeat,
  BookOpen, Target, ListChecks, Sparkles, Award, CheckCircle2, Zap,
};

function CoachPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["coach", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [items, cats, acts] = await Promise.all([
        supabase.from("items").select("*").eq("user_id", user!.id),
        supabase.from("categories").select("*").eq("user_id", user!.id),
        supabase.from("activities").select("*").eq("user_id", user!.id)
          .order("created_at", { ascending: false }).limit(200),
      ]);
      const stats = computeCoachStats(items.data ?? [], cats.data ?? [], acts.data ?? []);
      const insights = generateInsights(items.data ?? [], cats.data ?? [], acts.data ?? [], stats);
      return { stats, insights, hasData: (items.data?.length ?? 0) > 0 || (cats.data?.length ?? 0) > 0 };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI Coach
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Your personal coach</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Insights and recommendations generated from your real activity across every category.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !data?.hasData ? (
        <Card className="border-dashed border-border bg-transparent">
          <CardContent className="mx-auto grid max-w-md place-items-center gap-3 p-10 text-center">
            <Sparkles className="h-7 w-7 text-primary" />
            <h3 className="font-semibold">Your coach needs some fuel</h3>
            <p className="text-sm text-muted-foreground">
              Add a few categories and items so the coach can analyze your patterns and suggest next steps.
            </p>
            <Link to="/categories"><Button className="bg-gradient-primary">Get started</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <ScoreCard stats={data.stats} />
          <MetricsGrid stats={data.stats} />
          <section>
            <h2 className="mb-3 text-lg font-semibold">Insights & recommendations</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.insights.map((i) => <InsightCard key={i.id} insight={i} />)}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Category breakdown</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.stats.perCategory.map((c) => {
                const Icon = getIcon(c.icon);
                return (
                  <Card key={c.id} className="border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg"
                          style={{ background: `${c.color}22`, color: c.color }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="truncate font-medium">{c.name}</h3>
                            <span className="text-xs text-muted-foreground">{c.pct}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.done}/{c.total} done · {c.lastActivityDays === null ? "no activity" :
                              c.lastActivityDays === 0 ? "active today" : `${c.lastActivityDays}d ago`}
                          </p>
                          <Progress value={c.pct} className="mt-2 h-1.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ScoreCard({ stats }: { stats: ReturnType<typeof computeCoachStats> }) {
  const label = stats.score >= 75 ? "On fire" : stats.score >= 40 ? "Steady" : "Warming up";
  return (
    <Card className="border-border bg-gradient-surface">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-4">
          <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-primary/30 bg-background text-3xl font-bold text-primary">
            {stats.score}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Productivity score</p>
            <p className="text-xl font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">Updated live from your activity</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat label="Today" value={`${stats.todayCompleted}/${stats.todayTotal || 0}`} sub="completed today" />
          <MiniStat label="This week" value={`${stats.weekCompleted}`} sub={`${stats.weekCreated} created`} />
          <MiniStat label="Completion" value={`${stats.completionRate}%`} sub="all-time" />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function MetricsGrid({ stats }: { stats: ReturnType<typeof computeCoachStats> }) {
  const cells = [
    { label: "Active goals", value: stats.activeGoals, icon: Target },
    { label: "Active habits", value: stats.activeHabits, icon: Repeat },
    { label: "Learning done", value: stats.learningDone, icon: BookOpen },
    { label: "Jobs applied", value: stats.jobsApplied, icon: Briefcase },
    { label: "Certifications", value: stats.certificationsEarned, icon: Award },
    { label: "Week momentum", value: stats.weekCompleted, icon: Zap },
  ];
  return (
    <section className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {cells.map((c) => (
        <Card key={c.label} className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <c.icon className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{c.value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = ICONS[insight.icon] ?? Sparkles;
  const tone = {
    positive: "border-success/40 bg-success/5 text-success",
    warning: "border-warning/40 bg-warning/5 text-warning",
    info: "border-primary/30 bg-primary/5 text-primary",
    suggestion: "border-accent/40 bg-accent/10 text-accent-foreground",
  }[insight.tone];
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {insight.metric ?? insight.tone}
        </div>
        <h3 className="font-semibold leading-snug">{insight.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{insight.body}</p>
      </CardContent>
    </Card>
  );
}