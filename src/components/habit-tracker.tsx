import { useMemo, useState } from "react";
import { MoreVertical, Edit2, Trash2, Flame, Check, Trophy, CalendarDays, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, subDays, isSameMonth } from "date-fns";

function toDateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function computeStreak(loggedDates: Set<string>): number {
  let streak = 0;
  let cursor = new Date();
  // If today isn't logged yet, streak counts from yesterday backwards (still "alive").
  if (!loggedDates.has(toDateKey(cursor))) {
    cursor = subDays(cursor, 1);
  }
  while (loggedDates.has(toDateKey(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function computeBestStreak(loggedDates: Set<string>, windowDays = 180): number {
  let best = 0;
  let run = 0;
  for (let i = windowDays; i >= 0; i--) {
    if (loggedDates.has(toDateKey(subDays(new Date(), i)))) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

export function computeCompletionRate(loggedDates: Set<string>, windowDays = 30): number {
  let count = 0;
  for (let i = 0; i < windowDays; i++) {
    if (loggedDates.has(toDateKey(subDays(new Date(), i)))) count++;
  }
  return Math.round((count / windowDays) * 100);
}

const PRIORITY_EDGE: Record<string, string> = {
  high: "before:bg-destructive",
  medium: "before:bg-warning",
  low: "before:bg-primary",
};

export function HabitRow({
  item, loggedDates, onToggleDay, onEdit, onDelete,
}: {
  item: { id: string; title: string; description?: string | null; priority: "low" | "medium" | "high" };
  loggedDates: Set<string>;
  onToggleDay: (dateKey: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [popKey, setPopKey] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());
  const streak = computeStreak(loggedDates);
  const best = computeBestStreak(loggedDates);
  const completion = computeCompletionRate(loggedDates);
  const doneToday = loggedDates.has(todayKey);

  const days = useMemo(
    () => Array.from({ length: range }, (_, i) => subDays(new Date(), range - 1 - i)),
    [range],
  );

  function tick(key: string) {
    setPopKey(key);
    window.setTimeout(() => setPopKey((k) => (k === key ? null : k)), 450);
    onToggleDay(key);
  }

  // Heatmap intensity: deeper ember for longer consecutive runs ending on that day.
  function intensity(d: Date) {
    let run = 0;
    let cursor = d;
    while (loggedDates.has(toDateKey(cursor)) && run < 5) {
      run++;
      cursor = subDays(cursor, 1);
    }
    return run; // 0..5
  }

  return (
    <Card
      className={`habit-card group relative overflow-hidden border-border bg-gradient-surface before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] ${PRIORITY_EDGE[item.priority]}`}
    >
      <CardContent className="space-y-4 p-4 pl-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold tracking-tight">{item.title}</p>
              <PriorityBadge p={item.priority} />
              {streak > 0 && (
                <Badge variant="outline" className="habit-streak gap-1 border-warning/40 bg-warning/10 text-warning">
                  <Flame className="h-3 w-3" /> {streak} day{streak === 1 ? "" : "s"}
                </Badge>
              )}
              {best > 0 && best > streak && (
                <Badge variant="outline" className="gap-1 border-border bg-background/40 text-muted-foreground">
                  <Trophy className="h-3 w-3" /> best {best}
                </Badge>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold leading-none">{completion}%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">30-day</p>
            </div>
            <Button
              size="sm"
              variant={doneToday ? "default" : "outline"}
              onClick={() => tick(todayKey)}
              className={`h-8 gap-1 transition ${doneToday ? "shadow-elegant" : "hover:border-primary/60"}`}
            >
              {doneToday ? <Check className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {doneToday ? "Done today" : "Log today"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> last {range} days
          </p>
          <div className="habit-range">
            {([7, 14, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`habit-range-btn ${range === r ? "is-active" : ""}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1">
          {days.map((d, idx) => {
            const key = toDateKey(d);
            const done = loggedDates.has(key);
            const isToday = key === todayKey;
            const level = done ? intensity(d) : 0;
            const monthBreak = idx > 0 && !isSameMonth(d, days[idx - 1]!);
            return (
              <div key={key} className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${monthBreak ? "habit-month-break" : ""}`}>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">
                  {range <= 14 ? format(d, "EEEEE") : ""}
                </span>
                <button
                  onClick={() => tick(key)}
                  title={`${format(d, "EEE, MMM d")} — ${done ? "completed" : "not logged"}`}
                  aria-pressed={done}
                  className={`habit-cell ${done ? "is-done" : ""} ${isToday ? "is-today" : ""} ${popKey === key ? "is-pop" : ""}`}
                  data-level={level}
                >
                  <span className="habit-cell-label">{format(d, "d")}</span>
                  {done && <Check className="habit-cell-check h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ p }: { p: "low" | "medium" | "high" }) {
  const map = {
    high: "border-destructive/40 bg-destructive/15 text-destructive",
    medium: "border-warning/40 bg-warning/15 text-warning",
    low: "border-primary/40 bg-primary/15 text-primary",
  };
  return <Badge variant="outline" className={`capitalize ${map[p]}`}>{p}</Badge>;
}
