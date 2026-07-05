import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, MoreVertical, Edit2, Trash2, Filter, FileCheck2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getIcon } from "@/lib/icons";
import { ItemDialog, type ItemDraft } from "@/components/item-dialog";
import {
  JobItemDialog, type JobItemDraft, type JobStatus,
  JOB_STATUS_LABELS, JOB_STATUS_ORDER,
} from "@/components/job-item-dialog";
import { HabitRow } from "@/components/habit-tracker";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

export const Route = createFileRoute("/_app/categories/$id")({
  head: () => ({ meta: [{ title: "Category — CtrlTrack" }] }),
  component: CategoryDetail,
});

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function isJobsCategory(name: string | undefined) {
  return (name ?? "").trim().toLowerCase() === "jobs applied";
}

function isHabitsCategory(name: string | undefined) {
  return (name ?? "").trim().toLowerCase() === "habits";
}

function CategoryDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "alpha" | "priority">("newest");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ItemDraft | null>(null);
  const [editingJob, setEditingJob] = useState<JobItemDraft | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: category } = useQuery({
    queryKey: ["category", id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items").select("*").eq("category_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isJobs = isJobsCategory(category?.name);
  const isHabits = isHabitsCategory(category?.name);

  const { data: habitLogs = [] } = useQuery({
    queryKey: ["habit-logs", id, items.map((i: any) => i.id)],
    enabled: !!user && isHabits && items.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .in("item_id", items.map((i: any) => i.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  const logsByItem = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (habitLogs as any[]).forEach((l) => {
      if (!map.has(l.item_id)) map.set(l.item_id, new Set());
      map.get(l.item_id)!.add(l.log_date);
    });
    return map;
  }, [habitLogs]);

  const filtered = useMemo(() => {
    let r = items as any[];
    if (search) {
      r = r.filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        (i.job_company ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (i.job_role ?? "").toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (!isJobs && !isHabits) {
      if (filter === "pending") r = r.filter((i) => !i.completed);
      if (filter === "completed") r = r.filter((i) => i.completed);
    }
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "oldest": return +new Date(a.created_at) - +new Date(b.created_at);
        case "alpha": return a.title.localeCompare(b.title);
        case "priority": return PRIORITY_RANK[a.priority as "high"] - PRIORITY_RANK[b.priority as "high"];
        default: return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return r;
  }, [items, search, filter, sort, isJobs, isHabits]);

  const total = items.length;
  const done = items.filter((i: any) => i.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["items", id] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  // ---------- generic item save/toggle/remove (non-job, non-habit categories, and habit creation) ----------

  async function saveItem(draft: ItemDraft) {
    if (!user || !category) return;
    if (draft.id) {
      const { error } = await supabase.from("items").update({
        title: draft.title, description: draft.description, priority: draft.priority,
      }).eq("id", draft.id);
      if (error) return toast.error(error.message);
      await logActivity({ userId: user.id, action: "updated", entityType: "item", entityId: draft.id, entityTitle: draft.title, categoryId: category.id, categoryName: category.name });
      toast.success("Item updated");
    } else {
      const { data, error } = await supabase.from("items").insert({
        user_id: user.id, category_id: id, title: draft.title, description: draft.description, priority: draft.priority,
      }).select().single();
      if (error) return toast.error(error.message);
      await logActivity({ userId: user.id, action: "created", entityType: "item", entityId: data.id, entityTitle: draft.title, categoryId: category.id, categoryName: category.name });
      toast.success(isHabits ? "Habit added" : "Item added");
    }
    invalidateAll();
  }

  // ---------- job item save (Jobs Applied category) ----------

  async function saveJobItem(draft: JobItemDraft) {
    if (!user || !category) return;
    const computedTitle = `${draft.role} — ${draft.company}`;
    if (draft.id) {
      const { error } = await supabase.from("items").update({
        title: computedTitle,
        description: draft.description,
        priority: draft.priority,
        job_company: draft.company,
        job_role: draft.role,
        job_status: draft.status,
        job_resume_sent: draft.resumeSent,
        job_applied_date: draft.appliedDate || null,
        completed: draft.status === "offer",
        completed_at: draft.status === "offer" ? new Date().toISOString() : null,
      }).eq("id", draft.id);
      if (error) return toast.error(error.message);
      await logActivity({ userId: user.id, action: "updated", entityType: "item", entityId: draft.id, entityTitle: computedTitle, categoryId: category.id, categoryName: category.name });
      toast.success("Application updated");
    } else {
      const { data, error } = await supabase.from("items").insert({
        user_id: user.id, category_id: id, title: computedTitle, description: draft.description, priority: draft.priority,
        job_company: draft.company, job_role: draft.role, job_status: draft.status,
        job_resume_sent: draft.resumeSent, job_applied_date: draft.appliedDate || null,
      }).select().single();
      if (error) return toast.error(error.message);
      await logActivity({ userId: user.id, action: "created", entityType: "item", entityId: data.id, entityTitle: computedTitle, categoryId: category.id, categoryName: category.name });
      toast.success("Application added");
    }
    invalidateAll();
  }

  async function setJobStatus(item: any, status: JobStatus) {
    if (!user || !category) return;
    const { error } = await supabase.from("items").update({
      job_status: status,
      completed: status === "offer",
      completed_at: status === "offer" ? new Date().toISOString() : null,
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    await logActivity({ userId: user.id, action: "updated", entityType: "item", entityId: item.id, entityTitle: item.title, categoryId: category.id, categoryName: category.name });
    toast.success(`Moved to ${JOB_STATUS_LABELS[status]}`);
    invalidateAll();
  }

  // ---------- habit day toggle ----------

  async function toggleHabitDay(itemId: string, dateKey: string) {
    if (!user) return;
    const already = logsByItem.get(itemId)?.has(dateKey);
    if (already) {
      const { error } = await supabase.from("habit_logs").delete()
        .eq("item_id", itemId).eq("log_date", dateKey);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("habit_logs").insert({
        user_id: user.id, item_id: itemId, log_date: dateKey,
      });
      if (error) return toast.error(error.message);
      const it = items.find((i: any) => i.id === itemId);
      await logActivity({ userId: user.id, action: "completed", entityType: "item", entityId: itemId, entityTitle: it?.title, categoryId: category?.id, categoryName: category?.name });
    }
    qc.invalidateQueries({ queryKey: ["habit-logs", id] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  async function toggle(item: any) {
    if (!user || !category) return;
    const next = !item.completed;
    const { error } = await supabase.from("items").update({
      completed: next, completed_at: next ? new Date().toISOString() : null,
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    await logActivity({ userId: user.id, action: next ? "completed" : "uncompleted", entityType: "item", entityId: item.id, entityTitle: item.title, categoryId: category.id, categoryName: category.name });
    invalidateAll();
  }

  async function remove(itemId: string) {
    if (!user || !category) return;
    const it = items.find((i: any) => i.id === itemId);
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) return toast.error(error.message);
    await logActivity({ userId: user.id, action: "deleted", entityType: "item", entityId: itemId, entityTitle: it?.title, categoryId: category.id, categoryName: category.name });
    toast.success(isHabits ? "Habit deleted" : "Item deleted");
    invalidateAll();
  }

  if (!category) return <div className="text-muted-foreground">Loading…</div>;
  const Icon = getIcon(category.icon);

  // ---------- Jobs pipeline stats ----------
  const jobStats = useMemo(() => {
    const byStatus: Record<JobStatus, number> = {
      applied: 0, recruiter_action: 0, interview: 0, reviewed: 0, offer: 0, rejected: 0,
    };
    (items as any[]).forEach((i) => {
      const s = (i.job_status ?? "applied") as JobStatus;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    });
    return byStatus;
  }, [items]);

  // ---------- Habits overview stats ----------
  const habitOverview = useMemo(() => {
    if (!isHabits || !items.length) return { avgCompletion: 0, totalStreakDays: 0 };
    let sum = 0;
    (items as any[]).forEach((i) => {
      const logged = logsByItem.get(i.id) ?? new Set<string>();
      let count = 0;
      for (let d = 0; d < 30; d++) {
        const dt = new Date();
        dt.setDate(dt.getDate() - d);
        if (logged.has(format(dt, "yyyy-MM-dd"))) count++;
      }
      sum += Math.round((count / 30) * 100);
    });
    return { avgCompletion: Math.round(sum / items.length), totalStreakDays: habitLogs.length };
  }, [isHabits, items, logsByItem, habitLogs]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/categories" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All categories
      </Link>

      <Card className="border-border bg-gradient-surface">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl" style={{ background: `${category.color}22`, color: category.color }}>
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{category.name}</h1>
              <p className="text-sm text-muted-foreground">
                {isJobs
                  ? `${total} applications tracked`
                  : isHabits
                    ? `${total} habit${total === 1 ? "" : "s"} · ${habitOverview.avgCompletion}% avg 30-day consistency`
                    : `${done}/${total} items completed · ${pct}%`}
              </p>
            </div>
            <Button onClick={() => setCreating(true)} className="bg-gradient-primary shadow-elegant">
              <Plus className="mr-1 h-4 w-4" /> {isJobs ? "Log application" : isHabits ? "Add habit" : "Add item"}
            </Button>
          </div>
          {!isJobs && !isHabits && <Progress value={pct} className="mt-4 h-2" />}
        </CardContent>
      </Card>

      {isJobs && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {JOB_STATUS_ORDER.map((s) => (
            <Card key={s} className="border-border bg-card">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{jobStats[s]}</p>
                <p className="text-xs text-muted-foreground">{JOB_STATUS_LABELS[s]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isJobs ? "Search company or role…" : isHabits ? "Search habits…" : "Search items…"} className="pl-9" />
        </div>
        {!isJobs && !isHabits && (
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[150px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
        {!isHabits && (
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="alpha">Alphabetical</SelectItem>
              {!isJobs && <SelectItem value="priority">By priority</SelectItem>}
            </SelectContent>
          </Select>
        )}
      </div>

      {!filtered.length ? (
        <Card className="border-dashed border-border bg-transparent">
          <CardContent className="grid place-items-center gap-3 p-12 text-center">
            <p className="text-muted-foreground">
              {isJobs ? "No applications logged yet." : isHabits ? "No habits yet." : "No items yet."}
            </p>
            <Button onClick={() => setCreating(true)} className="bg-gradient-primary">
              <Plus className="mr-1 h-4 w-4" /> {isJobs ? "Log your first application" : isHabits ? "Add your first habit" : "Add your first item"}
            </Button>
          </CardContent>
        </Card>
      ) : isJobs ? (
        <div className="space-y-2">
          {filtered.map((it: any) => (
            <Card key={it.id} className="border-border bg-card transition hover:border-primary/40">
              <CardContent className="flex flex-wrap items-start gap-3 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{it.job_role || it.title}</p>
                    <span className="text-sm text-muted-foreground">@ {it.job_company || "—"}</span>
                    <PriorityBadge p={it.priority} />
                    {it.job_resume_sent && (
                      <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
                        <FileCheck2 className="h-3 w-3" /> Resume sent
                      </Badge>
                    )}
                  </div>
                  {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.job_applied_date ? `Applied ${format(new Date(it.job_applied_date), "MMM d, yyyy")}` : `Added ${formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}`}
                  </p>
                </div>
                <Select value={it.job_status ?? "applied"} onValueChange={(v) => setJobStatus(it, v as JobStatus)}>
                  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingJob({
                      id: it.id, company: it.job_company ?? "", role: it.job_role ?? "",
                      status: (it.job_status ?? "applied") as JobStatus, resumeSent: it.job_resume_sent ?? false,
                      appliedDate: it.job_applied_date ?? "", description: it.description ?? "", priority: it.priority,
                    })}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(it.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isHabits ? (
        <div className="space-y-3">
          {filtered.map((it: any) => (
            <HabitRow
              key={it.id}
              item={it}
              loggedDates={logsByItem.get(it.id) ?? new Set()}
              onToggleDay={(dateKey) => toggleHabitDay(it.id, dateKey)}
              onEdit={() => setEditing({ id: it.id, title: it.title, description: it.description ?? "", priority: it.priority })}
              onDelete={() => setDeleteId(it.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((it: any) => (
            <Card key={it.id} className="border-border bg-card transition hover:border-primary/40">
              <CardContent className="flex items-start gap-3 p-4">
                <Checkbox checked={it.completed} onCheckedChange={() => toggle(it)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-medium ${it.completed ? "line-through text-muted-foreground" : ""}`}>{it.title}</p>
                    <PriorityBadge p={it.priority} />
                  </div>
                  {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing({ id: it.id, title: it.title, description: it.description ?? "", priority: it.priority })}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(it.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isJobs ? (
        <>
          <JobItemDialog open={creating} onOpenChange={setCreating} title="Log application" onSubmit={saveJobItem} />
          <JobItemDialog open={!!editingJob} onOpenChange={(v) => !v && setEditingJob(null)} initial={editingJob ?? undefined} title="Edit application" onSubmit={saveJobItem} />
        </>
      ) : (
        <>
          <ItemDialog open={creating} onOpenChange={setCreating} title={isHabits ? "New habit" : "New item"} onSubmit={saveItem} />
          <ItemDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} initial={editing ?? undefined} title={isHabits ? "Edit habit" : "Edit item"} onSubmit={saveItem} />
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {isJobs ? "application" : isHabits ? "habit" : "item"}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
