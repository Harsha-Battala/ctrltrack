import { MoreVertical, Edit2, Trash2, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, subDays } from "date-fns";

const GRID_DAYS = 14;

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

export function computeCompletionRate(loggedDates: Set<string>, windowDays = 30): number {
  let count = 0;
  for (let i = 0; i < windowDays; i++) {
    if (loggedDates.has(toDateKey(subDays(new Date(), i)))) count++;
  }
  return Math.round((count / windowDays) * 100);
}

export function HabitRow({
  item, loggedDates, onToggleDay, onEdit, onDelete,
}: {
  item: { id: string; title: string; description?: string | null; priority: "low" | "medium" | "high" };
  loggedDates: Set<string>;
  onToggleDay: (dateKey: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const streak = computeStreak(loggedDates);
  const completion = computeCompletionRate(loggedDates);
  const days = Array.from({ length: GRID_DAYS }, (_, i) => subDays(new Date(), GRID_DAYS - 1 - i));

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{item.title}</p>
              <PriorityBadge p={item.priority} />
              {streak > 0 && (
                <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/10 text-warning">
                  <Flame className="h-3 w-3" /> {streak} day{streak === 1 ? "" : "s"}
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

        <div className="flex gap-1.5">
          {days.map((d) => {
            const key = toDateKey(d);
            const done = loggedDates.has(key);
            const isToday = key === toDateKey(new Date());
            return (
              <button
                key={key}
                onClick={() => onToggleDay(key)}
                title={format(d, "MMM d")}
                className={`grid h-8 flex-1 place-items-center rounded-md border text-[10px] font-medium transition
                  ${done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"}
                  ${isToday ? "ring-1 ring-primary/60 ring-offset-1 ring-offset-background" : ""}`}
              >
                {format(d, "d")}
              </button>
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
