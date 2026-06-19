import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ICONS, ICON_NAMES, COLOR_OPTIONS, getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type CategoryDraft = { id?: string; name: string; icon: string; color: string };

export function CategoryDialog({
  open, onOpenChange, initial, onSubmit, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CategoryDraft;
  onSubmit: (draft: CategoryDraft) => Promise<void> | void;
  title: string;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Folder");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setIcon(initial?.icon ?? "Folder");
      setColor(initial?.color ?? COLOR_OPTIONS[0]);
    }
  }, [open, initial]);

  const Preview = getIcon(icon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: `${color}22`, color }}>
              <Preview className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="catname">Name</Label>
              <Input id="catname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Companies Applied" />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Icon</Label>
            <div className="grid max-h-40 grid-cols-9 gap-2 overflow-auto rounded-lg border border-border p-2">
              {ICON_NAMES.map((n) => {
                const I = ICONS[n];
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setIcon(n)}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                      icon === n && "bg-primary/15 text-primary"
                    )}
                  >
                    <I className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-foreground")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={busy || !name.trim()}
            className="bg-gradient-primary"
            onClick={async () => {
              setBusy(true);
              await onSubmit({ id: initial?.id, name: name.trim(), icon, color });
              setBusy(false);
              onOpenChange(false);
            }}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}