import { createContext, useContext, useMemo, useState } from "react";
import { MoreVertical, Edit2, Trash2, Flame, Check, Trophy, CalendarDays, Zap, Undo2, Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SparkBurst } from "@/components/spark-burst";
import { toast } from "sonner";
import { format, subDays, isSameMonth, isBefore, startOfDay } from "date-fns";

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

/* ---------- Shared 7D / 14D / 30D range (one switch controls all cards) ---------- */

type Range = 7 | 14 | 30;
const HabitRangeContext = createContext<{ range: Range; setRange: (r: Range) => void } | null>(null);

export function HabitRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<Range>(14);
  return <HabitRangeContext.Provider value={{ range, setRange }}>{children}</HabitRangeContext.Provider>;
}

export function HabitRangeSwitch() {
  const ctx = useContext(HabitRangeContext);
  if (!ctx) return null;
  return (
    <div className="habit-range">
      {([7, 14, 30] as const).map((r) => (
        <button
          key={r}
          onClick={() => ctx.setRange(r)}
          className={`habit-range-btn ${ctx.range === r ? "is-active" : ""}`}
        >
          {r}d
        </button>
      ))}
    </div>
  );
}

const PRIORITY_EDGE: Record<string, string> = {
  high: "before:bg-destructive",
  medium: "before:bg-warning",
  low: "before:bg-primary",
};

const MILESTONES = [7, 14, 30];

export function HabitRow({
  item, loggedDates, onToggleDay, onEdit, onDelete,
}: {
  item: { id: string; title: string; description?: string | null; priority: "low" | "medium" | "high" };
  loggedDates: Set<string>;
  onToggleDay: (dateKey: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const shared = useContext(HabitRangeContext);
  const [localRange, setLocalRange] = useState<Range>(14);
  const range = shared?.range ?? localRange;
  const setRange = shared?.setRange ?? setLocalRange;

  const [popKey, setPopKey] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const [pulsing, setPulsing] = useState(false);

  const todayKey = toDateKey(new Date());
  const streak = computeStreak(loggedDates);
  const best = computeBestStreak(loggedDates);
  const completion = computeCompletionRate(loggedDates);
  const doneToday = loggedDates.has(todayKey);
  const milestone = MILESTONES.filter((m) => streak >= m).pop();

  const days = useMemo(
    () => Array.from({ length: range }, (_, i) => subDays(new Date(), range - 1 - i)),
    [range],
  );

  function tick(key: string) {
    const wasDone = loggedDates.has(key);
    setPopKey(key);
    window.setTimeout(() => setPopKey((k) => (k === key ? null : k)), 450);
    if (!wasDone) {
      setBurstKey(`${key}-${Date.now()}`);
      setPulsing(true);
      window.setTimeout(() => setPulsing(false), 500);
      // Streak after this check-in (only celebrate when logging today)
      if (key === todayKey) {
        const next = streak + (loggedDates.has(todayKey) ? 0 : 1);
        if (next > 1) toast.success(`Nice! ${next}-day streak 🔥`);
        else toast.success("Logged for today");
      }
    }
    onToggleDay(key);
  }

  // Heatmap intensity: deeper green for longer consecutive runs ending on that day.
  function intensity(d: Date) {
    let run = 0;
    let cursor = d;
    while (loggedDates.has(toDateKey(cursor)) && run < 5) {
      run++;
      cursor = subDays(cursor, 1);
    }
    return run; // 0..5
  }

  const todayStart = startOfDay(new Date());

  return (
    <Card
      className={`habit-card group relative overflow-hidden border-border bg-gradient-surface before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] ${PRIORITY_EDGE[item.priority]} ${pulsing ? "card-pulse" : ""}`}
    >
      <CardContent className="space-y-4 p-4 pl-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold tracking-tight">{item.title}</p>
              <PriorityBadge p={item.priority} />
              {streak > 0 && (
                <Badge variant="outline" className={`habit-streak gap-1 border-warning/40 bg-warning/10 text-warning ${streak >= 3 ? "flame-glow" : ""}`}>
                  <Flame className="h-3 w-3" /> {streak} day{streak === 1 ? "" : "s"}
                </Badge>
              )}
              {milestone && (
                <Badge variant="outline" className="gap-1 border-warning/50 bg-warning/15 text-warning">
                  <Medal className="h-3 w-3" /> {milestone}-day milestone
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
              <p className="label-bright mt-0.5">30-day</p>
            </div>
            <div className="relative">
              <SparkBurst burstKey={burstKey} />
              {doneToday ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => tick(todayKey)}
                    className="h-9 gap-1 border border-success/50 bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="h-3.5 w-3.5" /> Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => tick(todayKey)}
                    title="Undo today's check-in"
                    className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => tick(todayKey)}
                  className="h-9 gap-1 transition hover:border-primary/60"
                >
                  <Zap className="h-3.5 w-3.5" /> Log today
                </Button>
              )}
            </div>
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
          <p className="label-bright flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> last {range} days
          </p>
          {!shared && (
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
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {days.map((d, idx) => {
            const key = toDateKey(d);
            const done = loggedDates.has(key);
            const isToday = key === todayKey;
            const missed = !done && !isToday && isBefore(startOfDay(d), todayStart);
            const level = done ? intensity(d) : 0;
            const monthBreak = idx > 0 && !isSameMonth(d, days[idx - 1]!);
            return (
              <div key={key} className={`flex min-w-[34px] flex-1 flex-col items-center gap-1 ${monthBreak ? "habit-month-break" : ""}`}>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  {range <= 14 ? format(d, "EEEEE") : ""}
                </span>
                <button
                  onClick={() => tick(key)}
                  title={`${format(d, "EEE, MMM d")} — ${done ? "completed" : missed ? "missed" : "not logged"}`}
                  aria-pressed={done}
                  className={`habit-cell ${done ? "is-done" : ""} ${missed ? "habit-cell-missed" : ""} ${isToday ? "habit-today-ring" : ""} ${popKey === key ? "is-pop" : ""}`}
                  data-level={level}
                >
                  <span className="habit-cell-label">{format(d, "d")}</span>
                  {done && <Check className="habit-cell-check h-3 w-3" />}
                </button>
                <span className={`h-3 text-[9px] font-semibold uppercase tracking-wide ${isToday ? "text-primary" : "text-transparent"}`}>
                  Today
                </span>
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
