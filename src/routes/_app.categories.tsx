import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, MoreVertical, Trash2, Edit2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { CategoryDialog, type CategoryDraft } from "@/components/category-dialog";
import { logActivity } from "@/lib/activity";
import { ensureStarterCategories } from "@/lib/starter-categories";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/categories")({
  head: () => ({ meta: [{ title: "Categories — CtrlTrack" }] }),
  component: CategoriesLayout,
});

function CategoriesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // If a child route (category detail) is active, show only the outlet
  if (pathname !== "/categories") return <Outlet />;
  return <CategoriesList />;
}

function CategoriesList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<CategoryDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,color,description,created_at, items(id,completed)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => categories.filter((c: any) => c.name.toLowerCase().includes(q.toLowerCase())),
    [categories, q]
  );

  async function save(draft: CategoryDraft) {
    if (!user) return;
    if (draft.id) {
      const { error } = await supabase.from("categories").update({
        name: draft.name, icon: draft.icon, color: draft.color, description: draft.description ?? null,
      }).eq("id", draft.id);
      if (error) return toast.error(error.message);
      await logActivity({ userId: user.id, action: "updated", entityType: "category", entityId: draft.id, entityTitle: draft.name });
      toast.success("Category updated");
    } else {
      const { data, error } = await supabase.from("categories").insert({
        user_id: user.id, name: draft.name, icon: draft.icon, color: draft.color, description: draft.description ?? null,
      }).select().single();
      if (error) return toast.error(error.message);
      await logActivity({ userId: user.id, action: "created", entityType: "category", entityId: data.id, entityTitle: draft.name });
      toast.success("Category created");
    }
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  async function remove(id: string) {
    if (!user) return;
    const cat = categories.find((c: any) => c.id === id);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity({ userId: user.id, action: "deleted", entityType: "category", entityId: id, entityTitle: cat?.name });
    toast.success("Category deleted");
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  async function setupStarters() {
    if (!user) return;
    setSeeding(true);
    try {
      const n = await ensureStarterCategories(user.id);
      if (n === 0) toast.info("All starter categories already exist.");
      else toast.success(`Added ${n} starter ${n === 1 ? "category" : "categories"}.`);
      qc.invalidateQueries({ queryKey: ["categories-full"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to set up starter categories");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Your personal life & career operating system.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={setupStarters} disabled={seeding}>
            <Sparkles className="mr-1 h-4 w-4" /> {seeding ? "Setting up…" : "Setup Starter Categories"}
          </Button>
          <Button onClick={() => setCreating(true)} className="bg-gradient-primary shadow-elegant">
            <Plus className="mr-1 h-4 w-4" /> New category
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="pl-9" />
      </div>

      {!filtered.length ? (
        <Card className="border-dashed border-border bg-transparent">
          <CardContent className="mx-auto grid max-w-md place-items-center gap-3 p-12 text-center">
            {q ? (
              <p className="text-muted-foreground">No categories match "{q}".</p>
            ) : (
              <>
                <Sparkles className="h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold">Start with a ready-made command center</h3>
                <p className="text-sm text-muted-foreground">
                  Add the 8 starter categories — Jobs, Learning, Certifications, Goals, Habits,
                  Daily Goals, Fitness, and Tasks — in a single click. You can edit, remove, or
                  add unlimited custom categories afterwards.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button onClick={setupStarters} disabled={seeding} className="bg-gradient-primary">
                    <Sparkles className="mr-1 h-4 w-4" /> {seeding ? "Setting up…" : "Setup Starter Categories"}
                  </Button>
                  <Button variant="outline" onClick={() => setCreating(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Create custom
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => {
            const total = c.items?.length ?? 0;
            const done = c.items?.filter((i: any) => i.completed).length ?? 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const Icon = getIcon(c.icon);
            return (
              <Card key={c.id} className="group relative border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link to="/categories/$id" params={{ id: c.id }} className="flex flex-1 items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: `${c.color}22`, color: c.color }}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{c.name}</h3>
                        {c.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{done}/{total} completed</p>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing({ id: c.id, name: c.name, icon: c.icon, color: c.color })}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Progress value={pct} className="mt-4 h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryDialog open={creating} onOpenChange={setCreating} title="New category" onSubmit={save} />
      <CategoryDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} initial={editing ?? undefined} title="Edit category" onSubmit={save} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>All items inside will be permanently deleted. This can't be undone.</AlertDialogDescription>
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