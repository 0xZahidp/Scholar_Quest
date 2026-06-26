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
import { fireXp } from "@/components/xp-float-bus";
import { toast } from "sonner";
import { GraduationCap, Plus, Trash2, MapPin, Calendar, DollarSign, Trophy } from "lucide-react";
import {
  UNI_STATUSES,
  getUniversities,
  upsertUniversity,
  deleteUniversity,
} from "@/lib/universities.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/universities")({
  head: () => ({ meta: [{ title: "University Shortlist — Operation Global Scholar" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: UniversitiesPage,
});

const STATUS_META: Record<string, { label: string; color: string }> = {
  researching: {
    label: "Researching",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
  shortlisted: {
    label: "Shortlisted",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  applied: { label: "Applied", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  admitted: {
    label: "Admitted 🎉",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  rejected: { label: "Rejected", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
};

type Uni = {
  id: string;
  name: string;
  country: string | null;
  program: string | null;
  status: string;
  deadline: string | null;
  tuition_usd: number | null;
  ranking: number | null;
  notes: string | null;
};

function UniversitiesPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getUniversities);
  const upsertFn = useServerFn(upsertUniversity);
  const deleteFn = useServerFn(deleteUniversity);
  const q = useQuery({ queryKey: ["universities"], queryFn: () => fetchFn() });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["universities"] });
    qc.invalidateQueries({ queryKey: ["xp"] });
  };
  const saveMut = useMutation({
    mutationFn: upsertFn,
    onSuccess: (r) => {
      if (r.xp > 0) {
        fireXp(r.xp);
        toast.success("Application logged", { description: `+${r.xp} XP` });
      } else toast.success("Saved");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const delMut = useMutation({ mutationFn: deleteFn, onSuccess: invalidate });

  const unis = (q.data ?? []) as Uni[];
  const grouped = UNI_STATUSES.map((s) => ({
    status: s,
    items: unis.filter((u) => u.status === s),
  }));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Uni | null>(null);
  const empty = {
    name: "",
    country: "",
    program: "",
    status: "researching" as (typeof UNI_STATUSES)[number],
    deadline: "",
    tuition_usd: "",
    ranking: "",
    notes: "",
  };
  const [form, setForm] = useState(empty);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(u: Uni) {
    setEditing(u);
    setForm({
      name: u.name,
      country: u.country ?? "",
      program: u.program ?? "",
      status: u.status as any,
      deadline: u.deadline ?? "",
      tuition_usd: u.tuition_usd != null ? String(u.tuition_usd) : "",
      ranking: u.ranking != null ? String(u.ranking) : "",
      notes: u.notes ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" /> University Shortlist
            </div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Pick your targets. Hit them precisely.
            </h1>
            <p className="text-sm text-muted-foreground">
              Move universities through the funnel — submitting an application unlocks {500} XP.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Add university
          </Button>
        </header>

        <section className="grid gap-4 lg:grid-cols-5">
          {grouped.map((col, ci) => (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", STATUS_META[col.status].color)}
                >
                  {STATUS_META[col.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.length === 0 ? (
                  <GlassCard className="border-dashed p-4 text-center text-xs text-muted-foreground">
                    No entries.
                  </GlassCard>
                ) : (
                  col.items.map((u, i) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ci * 0.04 + i * 0.02 }}
                    >
                      <GlassCard className="p-0 transition-colors hover:border-primary/40">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openEdit(u)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openEdit(u);
                          }}
                          className="cursor-pointer p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight">
                              {u.name}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                delMut.mutate({ data: { id: u.id } } as any);
                              }}
                              className="rounded p-1 text-muted-foreground hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {u.program && (
                            <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                              {u.program}
                            </div>
                          )}
                          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                            {u.country && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {u.country}
                              </div>
                            )}
                            {u.deadline && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(u.deadline).toLocaleDateString()}
                              </div>
                            )}
                            {u.tuition_usd != null && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />$
                                {Number(u.tuition_usd).toLocaleString()}/yr
                              </div>
                            )}
                            {u.ranking != null && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                Rank #{u.ranking}
                              </div>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ))}
        </section>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit university" : "Add university"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>University name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ETH Zürich"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Country</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Switzerland"
                  />
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
                      {UNI_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Program</Label>
                <Input
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                  placeholder="MSc Computer Science"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tuition (USD/yr)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.tuition_usd}
                    onChange={(e) => setForm({ ...form, tuition_usd: e.target.value })}
                  />
                </div>
                <div>
                  <Label>QS Rank</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.ranking}
                    onChange={(e) => setForm({ ...form, ranking: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={saveMut.isPending}
                onClick={async () => {
                  if (!form.name.trim()) {
                    toast.error("Name required");
                    return;
                  }
                  await saveMut.mutateAsync({
                    data: {
                      id: editing?.id,
                      name: form.name.trim(),
                      country: form.country || undefined,
                      program: form.program || undefined,
                      status: form.status,
                      deadline: form.deadline || undefined,
                      tuition_usd: form.tuition_usd ? Number(form.tuition_usd) : null,
                      ranking: form.ranking ? Number(form.ranking) : null,
                      notes: form.notes || undefined,
                    },
                  } as any);
                  setOpen(false);
                }}
              >
                {editing ? "Save changes" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
