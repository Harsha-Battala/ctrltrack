import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getIcon } from "@/lib/icons";
import { FolderKanban, LayoutDashboard, ListTodo, Plus, Repeat, Search, Sparkles } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data } = useQuery({
    queryKey: ["palette", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const [cats, items] = await Promise.all([
        supabase.from("categories").select("id,name,icon,color").eq("user_id", user!.id),
        supabase.from("items").select("id,title,category_id").eq("user_id", user!.id).limit(100),
      ]);
      return { cats: cats.data ?? [], items: items.data ?? [] };
    },
  });

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const cats = (data?.cats ?? []).filter((c: any) => !needle || c.name.toLowerCase().includes(needle)).slice(0, 5);
    const items = (data?.items ?? []).filter((i: any) => needle && i.title.toLowerCase().includes(needle)).slice(0, 6);
    return { cats, items };
  }, [data, q]);

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    setQ("");
    navigate({ to, params } as any);
  }

  const actions = [
    { label: "Go to Dashboard", icon: LayoutDashboard, run: () => go("/dashboard") },
    { label: "Add task", icon: Plus, run: () => go("/categories") },
    { label: "Add habit", icon: Repeat, run: () => go("/categories") },
    { label: "Ask AI Coach", icon: Sparkles, run: () => go("/coach") },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories and tasks…"
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.cats.length > 0 && (
            <>
              <p className="label-bright px-2 py-1.5">Categories</p>
              {results.cats.map((c: any) => {
                const Icon = getIcon(c.icon);
                return (
                  <button key={c.id} onClick={() => go("/categories/$id", { id: c.id })}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
                    <span className="grid h-7 w-7 place-items-center rounded-md" style={{ background: `${c.color}22`, color: c.color }}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {c.name}
                  </button>
                );
              })}
            </>
          )}
          {results.items.length > 0 && (
            <>
              <p className="label-bright px-2 py-1.5">Tasks</p>
              {results.items.map((i: any) => (
                <button key={i.id} onClick={() => go("/categories/$id", { id: i.category_id })}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{i.title}</span>
                </button>
              ))}
            </>
          )}
          <p className="label-bright px-2 py-1.5">Actions</p>
          {actions.map((a) => (
            <button key={a.label} onClick={a.run}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
              <a.icon className="h-4 w-4 text-primary" />
              {a.label}
            </button>
          ))}
          {!results.cats.length && !results.items.length && q && (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches for "{q}".</p>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <FolderKanban className="mr-1 inline h-3 w-3" /> Tip: press Ctrl+K (Cmd+K on Mac) anytime to open this.
        </div>
      </DialogContent>
    </Dialog>
  );
}
