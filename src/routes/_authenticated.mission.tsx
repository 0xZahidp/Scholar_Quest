import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { fireXp } from "@/components/XpFloat";
import { toast } from "sonner";
import { Target, Calendar, Plus, Trash2, Trophy, AlertTriangle, Flag, Sparkles } from "lucide-react";
import { SCHOLARSHIPS } from "@/lib/scholarships";
import {
  getDreams, removeDream, setDreamStatus,
  addDeadline, removeDeadline,
} from "@/lib/dreams.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/_authenticated/mission")({
  head: () => ({ meta: [{ title: "Mission Board — Operation Global Scholar" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: MissionPage,
});

const STATUS_META: Record<string, { label: string; color: string }> = {
  researching: { label: "Researching", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  preparing: { label: "Preparing", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  applied: { label: "Applied", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  interview: { label: "Interview", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  won: { label: "Won 🏆", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "Rejected", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
};

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function MissionPage() {
  const qc = useQueryClient();
  const fetchDreams = useServerFn(getDreams);
  const removeFn = useServerFn(removeDream);
  const statusFn = useServerFn(setDreamStatus);
  const addDeadlineFn = useServerFn(addDeadline);
  const removeDeadlineFn = useServerFn(removeDeadline);

  const q = useQuery({ queryKey: ["dreams"], queryFn: () => fetchDreams() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dreams"] });
    qc.invalidateQueries({ queryKey: ["xp"] });
  };

  const removeMut = useMutation({ mutationFn: removeFn, onSuccess: invalidate });
  const statusMut = useMutation({
    mutationFn: statusFn,
    onSuccess: (r, vars) => {
      const status = (vars as any).data.status;
      if (status === "won") confetti({ particleCount: 220, spread: 110, origin: { y: 0.6 } });
      if (r.xp > 0) {
        fireXp(r.xp);
        toast.success(`Status updated`, { description: `+${r.xp} XP` });
      }
      invalidate();
    },
  });
  const addDlMut = useMutation({
    mutationFn: addDeadlineFn,
    onSuccess: () => { toast.success("Deadline added"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const delDlMut = useMutation({ mutationFn: removeDeadlineFn, onSuccess: invalidate });

  const dreams = q.data?.dreams ?? [];
  const deadlines = (q.data?.deadlines ?? []).slice().sort((a: any, b: any) =>
    a.due_date.localeCompare(b.due_date)
  );

  const [open, setOpen] = useState(false);
  const [dlTitle, setDlTitle] = useState("");
  const [dlDate, setDlDate] = useState("");
  const [dlCat, setDlCat] = useState("custom");

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Mission Board
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Your shortlist. Your war room.</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track every scholarship you're chasing, plus the deadlines that decide your future.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link to="/scholarships"><Plus className="mr-1 h-4 w-4" /> Browse vault</Link>
            </Button>
          </div>
        </header>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl font-semibold">Dream Board</h2>
            <Badge variant="secondary">{dreams.length}</Badge>
          </div>

          {dreams.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No scholarships yet. Open the vault to add your first target.
              </p>
              <Button asChild className="mt-4">
                <Link to="/scholarships">Open Scholarship Vault</Link>
              </Button>
            </GlassCard>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dreams.map((d: any, i: number) => {
                const sch = SCHOLARSHIPS.find((s) => s.key === d.scholarship_key);
                if (!sch) return null;
                const days = daysUntil(sch.deadline);
                const danger = days >= 0 && days <= 30;
                const passed = days < 0;
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <GlassCard className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-2xl">{sch.flag}</div>
                          <h3 className="mt-1 font-display text-base font-bold leading-tight">{sch.name}</h3>
                          <div className="text-xs uppercase tracking-widest text-muted-foreground">{sch.country}</div>
                        </div>
                        <button
                          onClick={() => removeMut.mutate({ data: { id: d.id } } as any)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn(
                          "font-medium",
                          passed && "text-rose-400",
                          danger && "text-amber-400",
                        )}>
                          {passed
                            ? `Closed ${Math.abs(days)}d ago`
                            : days === 0
                            ? "Due today"
                            : `${days} days left`}
                        </span>
                        <span className="text-muted-foreground">· {new Date(sch.deadline).toLocaleDateString()}</span>
                      </div>

                      <div className="mt-3">
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_META[d.status]?.color)}>
                          {STATUS_META[d.status]?.label ?? d.status}
                        </Badge>
                      </div>

                      <div className="mt-auto pt-4">
                        <Select
                          value={d.status}
                          onValueChange={(v) => statusMut.mutate({ data: { id: d.id, status: v as any } } as any)}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_META).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl font-semibold">Deadline Timeline</h2>
              <Badge variant="secondary">{deadlines.length}</Badge>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary"><Plus className="mr-1 h-4 w-4" /> Add deadline</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New deadline</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={dlTitle} onChange={(e) => setDlTitle(e.target.value)} placeholder="GRE registration close" />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={dlDate} onChange={(e) => setDlDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={dlCat} onValueChange={setDlCat}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scholarship">Scholarship</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={async () => {
                      if (!dlTitle || !dlDate) { toast.error("Title and date required"); return; }
                      await addDlMut.mutateAsync({ data: { title: dlTitle, due_date: dlDate, category: dlCat } } as any);
                      setOpen(false); setDlTitle(""); setDlDate(""); setDlCat("custom");
                    }}
                    disabled={addDlMut.isPending}
                  >
                    Save deadline
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {deadlines.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No deadlines yet. They appear automatically when you add scholarships.</p>
            </GlassCard>
          ) : (
            <GlassCard className="divide-y divide-border/40 overflow-hidden">
              {deadlines.map((dl: any, i: number) => {
                const days = daysUntil(dl.due_date);
                const passed = days < 0;
                const danger = !passed && days <= 14;
                return (
                  <motion.div
                    key={dl.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <div className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-lg border text-center font-display",
                      passed && "border-rose-500/30 bg-rose-500/10 text-rose-300",
                      danger && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                      !passed && !danger && "border-primary/30 bg-primary/10 text-primary",
                    )}>
                      <div>
                        <div className="text-[10px] uppercase opacity-80">{new Date(dl.due_date).toLocaleDateString(undefined, { month: "short" })}</div>
                        <div className="text-sm font-bold leading-none">{new Date(dl.due_date).getDate()}</div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{dl.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {dl.category} · {passed ? `${Math.abs(days)}d ago` : days === 0 ? "today" : `in ${days}d`}
                      </div>
                    </div>
                    {danger && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                    <button
                      onClick={() => delDlMut.mutate({ data: { id: dl.id } } as any)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </GlassCard>
          )}
        </section>
      </div>
    </div>
  );
}
