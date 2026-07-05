import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type JobStatus = "applied" | "recruiter_action" | "interview" | "reviewed" | "offer" | "rejected";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  recruiter_action: "Recruiter Action",
  interview: "Interview",
  reviewed: "Reviewed",
  offer: "Offer",
  rejected: "Rejected",
};

export const JOB_STATUS_ORDER: JobStatus[] = [
  "applied", "recruiter_action", "interview", "reviewed", "offer", "rejected",
];

export type JobItemDraft = {
  id?: string;
  company: string;
  role: string;
  status: JobStatus;
  resumeSent: boolean;
  appliedDate: string; // yyyy-mm-dd
  description: string;
  priority: "low" | "medium" | "high";
};

export function JobItemDialog({
  open, onOpenChange, initial, onSubmit, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<JobItemDraft>;
  onSubmit: (draft: JobItemDraft) => Promise<unknown> | unknown;
  title: string;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<JobStatus>("applied");
  const [resumeSent, setResumeSent] = useState(false);
  const [appliedDate, setAppliedDate] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCompany(initial?.company ?? "");
      setRole(initial?.role ?? "");
      setStatus((initial?.status as JobStatus) ?? "applied");
      setResumeSent(initial?.resumeSent ?? false);
      setAppliedDate(initial?.appliedDate ?? new Date().toISOString().slice(0, 10));
      setDescription(initial?.description ?? "");
      setPriority((initial?.priority as any) ?? "medium");
    }
  }, [open, initial]);

  const canSave = company.trim() && role.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Java Intern" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appliedDate">Applied date</Label>
              <Input id="appliedDate" type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="resumeSent" checked={resumeSent} onCheckedChange={(v) => setResumeSent(!!v)} />
            <Label htmlFor="resumeSent" className="cursor-pointer font-normal">Resume sent</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jd">Notes</Label>
            <Textarea id="jd" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Interview notes, JD link, recruiter contact…" />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={busy || !canSave}
            className="bg-gradient-primary"
            onClick={async () => {
              setBusy(true);
              await onSubmit({
                id: initial?.id, company: company.trim(), role: role.trim(), status,
                resumeSent, appliedDate, description, priority,
              });
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
