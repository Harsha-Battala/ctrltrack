import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

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

const MAX_DOC_BYTES = 10 * 1024 * 1024; // must match the job-documents bucket limit

export type JobItemDraft = {
  id?: string;
  company: string;
  role: string;
  status: JobStatus;
  resumeSent: boolean;
  appliedDate: string; // yyyy-mm-dd
  description: string;
  priority: "low" | "medium" | "high";
  // Document attachment (single file). documentPath/documentName reflect what is
  // already stored; documentFile is a newly picked file; documentRemove clears the stored one.
  documentPath?: string;
  documentName?: string;
  documentType?: string;
  documentFile?: File | null;
  documentRemove?: boolean;
};

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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
  const [documentPath, setDocumentPath] = useState<string | undefined>();
  const [documentName, setDocumentName] = useState<string | undefined>();
  const [documentType, setDocumentType] = useState<string | undefined>();
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentRemove, setDocumentRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCompany(initial?.company ?? "");
      setRole(initial?.role ?? "");
      setStatus((initial?.status as JobStatus) ?? "applied");
      setResumeSent(initial?.resumeSent ?? false);
      setAppliedDate(initial?.appliedDate ?? new Date().toISOString().slice(0, 10));
      setDescription(initial?.description ?? "");
      setPriority((initial?.priority as any) ?? "medium");
      setDocumentPath(initial?.documentPath);
      setDocumentName(initial?.documentName);
      setDocumentType(initial?.documentType);
      setDocumentFile(null);
      setDocumentRemove(false);
    }
  }, [open, initial]);

  const canSave = company.trim() && role.trim();

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    if (f.size > MAX_DOC_BYTES) {
      toast.error("That file is larger than 10 MB. Please pick a smaller one.");
      return;
    }
    setDocumentFile(f);
    setDocumentRemove(false);
  }

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
            <Label>Document</Label>
            <p className="text-xs text-muted-foreground">
              Attach your resume, cover letter or any file — PDF, Word, image… (max 10 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.rtf,.txt,.md,.ppt,.pptx,.xls,.xlsx,image/*"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {documentFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{documentFile.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtSize(documentFile.size)}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setDocumentFile(null)}>
                  Remove
                </Button>
              </div>
            ) : documentName && !documentRemove ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{documentName}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => fileInputRef.current?.click()}>
                  Replace
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDocumentRemove(true)}>
                  Remove
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="mr-2 h-4 w-4" /> Attach document
              </Button>
            )}
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
                documentPath, documentName, documentType,
                documentFile, documentRemove,
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
