import { differenceInCalendarDays, isToday, isThisWeek, subDays } from "date-fns";

export type ItemRow = {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  priority: string;
  category_id: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_title: string | null;
  category_name: string | null;
  created_at: string;
};

export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: "positive" | "warning" | "info" | "suggestion";
  icon: string;
  metric?: string;
};

export type CoachStats = {
  score: number;
  todayCompleted: number;
  todayTotal: number;
  weekCompleted: number;
  weekCreated: number;
  completionRate: number;
  activeGoals: number;
  activeHabits: number;
  learningDone: number;
  jobsApplied: number;
  certificationsEarned: number;
  mostActive?: { name: string; count: number };
  leastActive?: { name: string; days: number };
  perCategory: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    total: number;
    done: number;
    pct: number;
    lastActivityDays: number | null;
  }>;
};

function findCat(cats: CategoryRow[], name: string) {
  return cats.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function computeCoachStats(
  items: ItemRow[],
  cats: CategoryRow[],
  activities: ActivityRow[],
): CoachStats {
  const now = new Date();
  const weekAgo = subDays(now, 7);

  const todayItems = items.filter((i) => isToday(new Date(i.updated_at)));
  const todayCompleted = todayItems.filter((i) => i.completed).length;
  const weekCompleted = items.filter(
    (i) => i.completed && i.completed_at && new Date(i.completed_at) >= weekAgo,
  ).length;
  const weekCreated = items.filter((i) => new Date(i.created_at) >= weekAgo).length;

  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const goalsCat = findCat(cats, "Goals");
  const habitsCat = findCat(cats, "Habits");
  const learningCat = findCat(cats, "Learning");
  const jobsCat = findCat(cats, "Jobs Applied");
  const certCat = findCat(cats, "Certifications");

  const activeGoals = goalsCat
    ? items.filter((i) => i.category_id === goalsCat.id && !i.completed).length
    : 0;
  const activeHabits = habitsCat
    ? items.filter((i) => i.category_id === habitsCat.id && !i.completed).length
    : 0;
  const learningDone = learningCat
    ? items.filter((i) => i.category_id === learningCat.id && i.completed).length
    : 0;
  const jobsApplied = jobsCat
    ? items.filter((i) => i.category_id === jobsCat.id).length
    : 0;
  const certificationsEarned = certCat
    ? items.filter((i) => i.category_id === certCat.id && i.completed).length
    : 0;

  const perCategory = cats.map((c) => {
    const catItems = items.filter((i) => i.category_id === c.id);
    const done = catItems.filter((i) => i.completed).length;
    const pct = catItems.length ? Math.round((done / catItems.length) * 100) : 0;
    const lastAct = activities
      .filter((a) => a.category_name?.toLowerCase() === c.name.toLowerCase())
      .map((a) => new Date(a.created_at).getTime())
      .concat(catItems.map((i) => new Date(i.updated_at).getTime()));
    const lastActivityDays = lastAct.length
      ? differenceInCalendarDays(now, new Date(Math.max(...lastAct)))
      : null;
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      total: catItems.length,
      done,
      pct,
      lastActivityDays,
    };
  });

  const active = [...perCategory].filter((c) => c.total > 0);
  const mostActive = active.length
    ? active.reduce((a, b) => (b.done > a.done ? b : a))
    : undefined;
  const stalest = perCategory
    .filter((c) => c.lastActivityDays !== null)
    .sort((a, b) => (b.lastActivityDays! - a.lastActivityDays!))[0];
  const leastActive = stalest && stalest.lastActivityDays! >= 3
    ? { name: stalest.name, days: stalest.lastActivityDays! }
    : undefined;

  // Score: blend completion rate, weekly activity, category coverage
  const activityBoost = Math.min(20, weekCompleted * 2);
  const coverage = perCategory.length
    ? Math.round((perCategory.filter((c) => c.total > 0).length / perCategory.length) * 20)
    : 0;
  const score = Math.max(0, Math.min(100, Math.round(completionRate * 0.6) + activityBoost + coverage));

  return {
    score,
    todayCompleted,
    todayTotal: todayItems.length,
    weekCompleted,
    weekCreated,
    completionRate,
    activeGoals,
    activeHabits,
    learningDone,
    jobsApplied,
    certificationsEarned,
    mostActive: mostActive ? { name: mostActive.name, count: mostActive.done } : undefined,
    leastActive,
    perCategory,
  };
}

export function generateInsights(
  items: ItemRow[],
  cats: CategoryRow[],
  activities: ActivityRow[],
  stats: CoachStats,
): Insight[] {
  const out: Insight[] = [];
  const now = new Date();

  out.push({
    id: "weekly-summary",
    title: "Weekly productivity summary",
    body: `You completed ${stats.weekCompleted} ${stats.weekCompleted === 1 ? "task" : "tasks"} in the last 7 days across ${stats.perCategory.filter((c) => c.total > 0).length} active ${stats.perCategory.filter((c) => c.total > 0).length === 1 ? "category" : "categories"}. Your overall completion rate is ${stats.completionRate}%.`,
    tone: stats.weekCompleted >= 5 ? "positive" : "info",
    icon: "TrendingUp",
    metric: `${stats.weekCompleted} done`,
  });

  if (stats.mostActive) {
    out.push({
      id: "most-active",
      title: "Most active area",
      body: `${stats.mostActive.name} is where you're building the most momentum, with ${stats.mostActive.count} completed ${stats.mostActive.count === 1 ? "item" : "items"}. Keep leaning into it.`,
      tone: "positive",
      icon: "Flame",
    });
  }

  if (stats.leastActive) {
    out.push({
      id: "least-active",
      title: `${stats.leastActive.name} is going quiet`,
      body: `You haven't updated ${stats.leastActive.name} in ${stats.leastActive.days} days. A quick 5-minute check-in today will keep the streak alive.`,
      tone: "warning",
      icon: "AlertCircle",
    });
  }

  // Job vs learning comparison
  if (stats.learningDone > 0 && stats.jobsApplied >= 0) {
    if (stats.learningDone > stats.jobsApplied * 2 && stats.jobsApplied < 5) {
      out.push({
        id: "learning-vs-jobs",
        title: "Convert learning into opportunities",
        body: `Your learning progress (${stats.learningDone} completed) is outpacing your job applications (${stats.jobsApplied}). Consider applying to 3 more companies this week to convert skills into interviews.`,
        tone: "suggestion",
        icon: "Briefcase",
      });
    }
  }

  // Yesterday's daily goals
  const dailyCat = cats.find((c) => c.name.toLowerCase() === "daily goals");
  if (dailyCat) {
    const yesterday = subDays(now, 1);
    const y = items.filter(
      (i) =>
        i.category_id === dailyCat.id &&
        differenceInCalendarDays(now, new Date(i.updated_at)) === 1,
    );
    if (y.length) {
      const done = y.filter((i) => i.completed).length;
      const pct = Math.round((done / y.length) * 100);
      out.push({
        id: "daily-yesterday",
        title: "Yesterday's daily goals",
        body: `You completed ${pct}% of your daily goals yesterday (${done}/${y.length}). ${pct >= 80 ? "Excellent consistency." : "A small win today can rebuild the streak."}`,
        tone: pct >= 80 ? "positive" : "info",
        icon: "Calendar",
      });
    }
  }

  // Habit consistency
  if (stats.activeHabits > 0) {
    const habitsCat = cats.find((c) => c.name.toLowerCase() === "habits");
    const recent = activities.filter(
      (a) => a.category_name?.toLowerCase() === "habits" && new Date(a.created_at) >= subDays(now, 7),
    ).length;
    out.push({
      id: "habit-consistency",
      title: "Habit consistency",
      body: `You have ${stats.activeHabits} active ${stats.activeHabits === 1 ? "habit" : "habits"} and logged ${recent} habit updates this week. Aim for a daily check-in to compound results.`,
      tone: recent >= 5 ? "positive" : "suggestion",
      icon: "Repeat",
    });
  }

  // Learning progress
  if (stats.learningDone > 0) {
    out.push({
      id: "learning-progress",
      title: "Learning progress",
      body: `You've completed ${stats.learningDone} learning ${stats.learningDone === 1 ? "task" : "tasks"} so far. Block 30 minutes tomorrow to keep the curve climbing.`,
      tone: "info",
      icon: "BookOpen",
    });
  }

  // Job search
  if (stats.jobsApplied > 0) {
    out.push({
      id: "job-search",
      title: "Job search progress",
      body: `${stats.jobsApplied} ${stats.jobsApplied === 1 ? "application" : "applications"} tracked. Follow up on applications older than 7 days — a short nudge doubles response rates.`,
      tone: "info",
      icon: "Briefcase",
    });
  }

  // Goals falling behind
  const goalsCat = cats.find((c) => c.name.toLowerCase() === "goals");
  if (goalsCat) {
    const stale = items.filter(
      (i) =>
        i.category_id === goalsCat.id &&
        !i.completed &&
        differenceInCalendarDays(now, new Date(i.updated_at)) >= 7,
    );
    if (stale.length) {
      out.push({
        id: "goals-behind",
        title: "Goals falling behind",
        body: `${stale.length} ${stale.length === 1 ? "goal hasn't" : "goals haven't"} been touched in over a week. Break the biggest one into a single 15-minute next step.`,
        tone: "warning",
        icon: "Target",
      });
    }
  }

  // Priorities for tomorrow
  const tomorrow = items
    .filter((i) => !i.completed)
    .sort((a, b) => {
      const rank = (p: string) => (p === "high" ? 0 : p === "medium" ? 1 : 2);
      return rank(a.priority) - rank(b.priority);
    })
    .slice(0, 3);
  if (tomorrow.length) {
    out.push({
      id: "tomorrow",
      title: "Suggested priorities for tomorrow",
      body: tomorrow.map((t, i) => `${i + 1}. ${t.title}`).join("  •  "),
      tone: "suggestion",
      icon: "ListChecks",
    });
  }

  // Motivation
  out.push({
    id: "motivation",
    title: "Coach's note",
    body: stats.score >= 75
      ? "You're operating at a high level. Protect your focus blocks and keep shipping."
      : stats.score >= 40
        ? "Steady progress. Pick one category to double down on this week."
        : "Every system starts small. Complete one item today to build momentum.",
    tone: "info",
    icon: "Sparkles",
  });

  return out;
}