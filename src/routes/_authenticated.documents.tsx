import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { fireXp } from "@/components/xp-float-bus";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Upload,
  Loader2,
} from "lucide-react";
import {
  DOCUMENT_KINDS,
  DOC_STATUSES,
  getDocuments,
  upsertDocument,
  deleteDocument,
} from "@/lib/documents.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Document Vault — Operation Global Scholar" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: DocumentsPage,
});

const STATUS_META: Record<string, { label: string; color: string; progress: number }> = {
  not_started: {
    label: "Not started",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    progress: 0,
  },
  drafting: {
    label: "Drafting",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    progress: 33,
  },
  in_review: {
    label: "In review",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    progress: 66,
  },
  finalized: {
    label: "Finalized",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    progress: 100,
  },
};

type DocRow = {
  id: string;
  kind: string;
  title: string;
  status: string;
  file_url: string | null;
  file_path: string | null;
  notes: string | null;
};

function DocumentsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getDocuments);
  const upsertFn = useServerFn(upsertDocument);
  const deleteFn = useServerFn(deleteDocument);

  const q = useQuery({ queryKey: ["documents"], queryFn: () => fetchFn() });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["xp"] });
  };

  const saveMut = useMutation({
    mutationFn: upsertFn,
    onSuccess: (r) => {
      if (r.xp > 0) {
        fireXp(r.xp);
        toast.success(`Document finalized`, { description: `+${r.xp} XP` });
      } else toast.success("Document saved");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const delMut = useMutation({ mutationFn: deleteFn, onSuccess: invalidate });

  const docs = (q.data ?? []) as DocRow[];
  const completed = docs.filter((d) => d.status === "finalized").length;
  const total = Math.max(docs.length, DOCUMENT_KINDS.length);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocRow | null>(null);
  const [form, setForm] = useState({
    kind: "cv",
    title: "",
    status: "drafting" as (typeof DOC_STATUSES)[number],
    file_url: "",
    file_path: "",
    notes: "",
  });
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File must be under 25MB");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("Could not create link");
      setForm((f) => ({
        ...f,
        file_url: signed.signedUrl,
        file_path: path,
        title: f.title || file.name,
      }));
      toast.success("File uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ kind: "cv", title: "", status: "drafting", file_url: "", file_path: "", notes: "" });
    setOpen(true);
  }
  function openEdit(d: DocRow) {
    setEditing(d);
    setForm({
      kind: d.kind,
      title: d.title,
      status: d.status as any,
      file_url: d.file_url ?? "",
      file_path: d.file_path ?? "",
      notes: d.notes ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Document Vault
            </div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Build the dossier that wins.
            </h1>
            <p className="text-sm text-muted-foreground">
              Track every document from blank page to finalized — earn XP at each milestone.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Add document
          </Button>
        </header>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">Dossier completion</span>
            </div>
            <span className="text-muted-foreground">
              {completed} of {DOCUMENT_KINDS.length} core docs · {progress}%
            </span>
          </div>
          <Progress value={progress} className="mt-2" />
        </GlassCard>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DOCUMENT_KINDS.map((k, i) => {
            const owned = docs.filter((d) => d.kind === k.key);
            return (
              <motion.div
                key={k.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        {k.key}
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold">{k.label}</h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      +{k.xp} XP
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {owned.length === 0 && (
                      <div className="rounded-md border border-dashed border-border/40 px-3 py-3 text-center text-xs text-muted-foreground">
                        Nothing here yet.
                      </div>
                    )}
                    {owned.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => openEdit(d)}
                        className="group flex w-full items-center gap-2 rounded-md border border-border/40 bg-card/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{d.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {STATUS_META[d.status]?.label}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", STATUS_META[d.status]?.color)}
                        >
                          {STATUS_META[d.status]?.progress}%
                        </Badge>
                        {d.file_url && (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            delMut.mutate({ data: { id: d.id } } as any);
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 self-start text-xs"
                    onClick={() => {
                      setEditing(null);
                      setForm({
                        kind: k.key,
                        title: k.label,
                        status: "drafting",
                        file_url: "",
                        file_path: "",
                        notes: "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> New {k.label}
                  </Button>
                </GlassCard>
              </motion.div>
            );
          })}
        </section>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit document" : "New document"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_KINDS.map((k) => (
                        <SelectItem key={k.key} value={k.key}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="MIT CS Master's — CV v3"
                />
              </div>
              <div>
                <Label>Upload file</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.md"
                    />
                    <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-card/40 px-3 py-2 text-sm hover:border-primary/50">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploading ? "Uploading…" : "Choose file (PDF, image, doc — max 25MB)"}
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <Label>Or paste a link (Drive, Notion, Docs...)</Label>
                <Input
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <span>
                  Finalizing a document awards XP. Iterate freely while drafting — only the first
                  finalize counts.
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={saveMut.isPending}
                onClick={async () => {
                  if (!form.title.trim()) {
                    toast.error("Title is required");
                    return;
                  }
                  await saveMut.mutateAsync({
                    data: {
                      id: editing?.id,
                      kind: form.kind,
                      title: form.title,
                      status: form.status,
                      file_url: form.file_url || undefined,
                      file_path: form.file_path || undefined,
                      notes: form.notes || undefined,
                    },
                  } as any);
                  setOpen(false);
                }}
              >
                {editing ? "Save changes" : "Add document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
