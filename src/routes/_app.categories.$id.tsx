import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, MoreVertical, Edit2, Trash2, Filter } from "lucide-react";
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
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/categories/$id")({
  head: () => ({ meta: [{ title: "Category — CtrlTrack" }] }),
  component: CategoryDetail,
});

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function CategoryDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "alpha" | "priority">("newest");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ItemDraft | null>(null);
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

  const filtered = useMemo(() => {
    let r = items as any[];
    if (search) r = r.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    if (filter === "pending") r = r.filter((i) => !i.completed);
    if (filter === "completed") r = r.filter((i) => i.completed);
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "oldest": return +new Date(a.created_at) - +new Date(b.created_at);
        case "alpha": return a.title.localeCompare(b.title);
        case "priority": return PRIORITY_RANK[a.priority as "high"] - PRIORITY_RANK[b.priority as "high"];
        default: return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return r;
  }, [items, search, filter, sort]);

  const total = items.length;
  const done = items.filter((i: any) => i.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

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
      toast.success("Item added");
    }
    qc.invalidateQueries({ queryKey: ["items", id] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function toggle(item: any) {
    if (!user || !category) return;
    const next = !item.completed;
    const { error } = await supabase.from("items").update({
      completed: next, completed_at: next ? new Date().toISOString() : null,
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    await logActivity({ userId: user.id, action: next ? "completed" : "uncompleted", entityType: "item", entityId: item.id, entityTitle: item.title, categoryId: category.id, categoryName: category.name });
    qc.invalidateQueries({ queryKey: ["items", id] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["categories-full"] });
  }

  async function remove(itemId: string) {
    if (!user || !category) return;
    const it = items.find((i: any) => i.id === itemId);
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) return toast.error(error.message);
    await logActivity({ userId: user.id, action: "deleted", entityType: "item", entityId: itemId, entityTitle: it?.title, categoryId: category.id, categoryName: category.name });
    toast.success("Item deleted");
    qc.invalidateQueries({ queryKey: ["items", id] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["categories-full"] });
  }

  if (!category) return <div className="text-muted-foreground">Loading…</div>;
  const Icon = getIcon(category.icon);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
              <p className="text-sm text-muted-foreground">{done}/{total} items completed · {pct}%</p>
            </div>
            <Button onClick={() => setCreating(true)} className="bg-gradient-primary shadow-elegant">
              <Plus className="mr-1 h-4 w-4" /> Add item
            </Button>
          </div>
          <Progress value={pct} className="mt-4 h-2" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[150px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="alpha">Alphabetical</SelectItem>
            <SelectItem value="priority">By priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <Card className="border-dashed border-border bg-transparent">
          <CardContent className="grid place-items-center gap-3 p-12 text-center">
            <p className="text-muted-foreground">No items yet.</p>
            <Button onClick={() => setCreating(true)} className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" /> Add your first item</Button>
          </CardContent>
        </Card>
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

      <ItemDialog open={creating} onOpenChange={setCreating} title="New item" onSubmit={saveItem} />
      <ItemDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} initial={editing ?? undefined} title="Edit item" onSubmit={saveItem} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
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