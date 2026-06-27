import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fireXp } from "@/components/xp-float-bus";
import { toast } from "sonner";
import { Mail, Plus, Users, Trash2, Pencil } from "lucide-react";
import {
  getProfessors,
  upsertProfessor,
  deleteProfessor,
  PROF_STATUSES,
} from "@/lib/professors.functions";

export const Route = createFileRoute("/_authenticated/professors")({
  head: () => ({ meta: [{ title: "Professor Outreach — Scholar Quest" }] }),
  component: ProfessorsPage,
});

type Form = {
  id?: string;
  name: string;
  university: string;
  field: string;
  email: string;
  status: (typeof PROF_STATUSES)[number];
  last_contact_on: string;
  notes: string;
};
const empty: Form = {
  name: "",
  university: "",
  field: "",
  email: "",
  status: "researching",
  last_contact_on: "",
  notes: "",
};

const STATUS_COLOR: Record<string, string> = {
  researching: "bg-slate-500/20 text-slate-300",
  drafted: "bg-blue-500/20 text-blue-300",
  emailed: "bg-amber-500/20 text-amber-300",
  replied: "bg-violet-500/20 text-violet-300",
  meeting: "bg-cyan-500/20 text-cyan-300",
  accepted: "bg-emerald-500/20 text-emerald-300",
};

function ProfessorsPage() {
  const qc = useQueryClient();
  const list = useServerFn(getProfessors);
  const save = useServerFn(upsertProfessor);
  const remove = useServerFn(deleteProfessor);
  const q = useQuery({ queryKey: ["professors"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const saveMut = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: (r) => {
      if (r.xp) fireXp(r.xp);
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["professors"] });
      qc.invalidateQueries({ queryKey: ["xp"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["professors"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Outreach Network
          </div>
          <h1 className="font-display text-3xl font-bold">Professors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cold emails turn into supervisors. Track every contact.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setForm(empty);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary">
              <Plus className="mr-1 h-4 w-4" /> Add contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit" : "New"} professor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Field label="Name *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="University">
                  <Input
                    value={form.university}
                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                  />
                </Field>
                <Field label="Research field">
                  <Input
                    value={form.field}
                    onChange={(e) => setForm({ ...form, field: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Last contact">
                  <Input
                    type="date"
                    value={form.last_contact_on}
                    onChange={(e) => setForm({ ...form, last_contact_on: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Form["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROF_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Notes">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
              <Button
                onClick={() => saveMut.mutate()}
                disabled={!form.name || saveMut.isPending}
                className="bg-gradient-to-r from-primary to-accent"
              >
                Save contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {q.isLoading ? null : !q.data || q.data.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <div className="font-display text-lg">Build your outreach network</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              One reply from a future supervisor can change everything.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data.map((p, i) => (
            <GlassCard key={p.id} delay={i * 0.04}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.university, p.field].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {p.email && (
                    <a
                      href={`mailto:${p.email}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary-glow hover:underline"
                    >
                      <Mail className="h-3 w-3" /> {p.email}
                    </a>
                  )}
                  {p.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>
                  )}
                </div>
                <Badge className={`shrink-0 ${STATUS_COLOR[p.status]}`}>{p.status}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                <span>
                  {p.last_contact_on ? `Last contact: ${p.last_contact_on}` : "Not yet contacted"}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setForm({
                        id: p.id,
                        name: p.name,
                        university: p.university ?? "",
                        field: p.field ?? "",
                        email: p.email ?? "",
                        status: p.status as Form["status"],
                        last_contact_on: p.last_contact_on ?? "",
                        notes: p.notes ?? "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => delMut.mutate(p.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
