import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { RadialRing } from "@/components/RadialRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, PiggyBank, Target } from "lucide-react";
import {
  FINANCE_KINDS,
  getFinance,
  addFinanceEntry,
  deleteFinanceEntry,
  setBudgetGoal,
} from "@/lib/finance.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/_authenticated/finances")({
  head: () => ({ meta: [{ title: "War Chest — Scholar Quest" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: FinancesPage,
});

const KIND_META: Record<string, { label: string; color: string; icon: any; sign: string }> = {
  income: { label: "Income", color: "text-emerald-400", icon: TrendingUp, sign: "+" },
  savings: { label: "Savings deposit", color: "text-primary", icon: PiggyBank, sign: "+" },
  expense: { label: "Expense", color: "text-rose-400", icon: TrendingDown, sign: "−" },
};

function FinancesPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getFinance);
  const addFn = useServerFn(addFinanceEntry);
  const delFn = useServerFn(deleteFinanceEntry);
  const goalFn = useServerFn(setBudgetGoal);

  const q = useQuery({ queryKey: ["finance"], queryFn: () => fetchFn() });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["finance"] });
    qc.invalidateQueries({ queryKey: ["xp"] });
  };

  const addMut = useMutation({
    mutationFn: addFn,
    onSuccess: (r) => {
      if (r.xp > 0) {
        fireXp(r.xp);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });
        toast.success("Savings milestone unlocked!", { description: `+${r.xp} XP` });
      } else toast.success("Entry added");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const delMut = useMutation({ mutationFn: delFn, onSuccess: invalidate });
  const goalMut = useMutation({
    mutationFn: goalFn,
    onSuccess: () => {
      toast.success("Goal updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const data = q.data ?? { entries: [], goal: 0, saved: 0 };
  const goal = Number(data.goal || 0);
  const saved = Number(data.saved || 0);
  const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;

  const totals = useMemo(() => {
    const out = { income: 0, expense: 0, savings: 0 };
    for (const e of data.entries as any[]) {
      const n = Number(e.amount);
      if (e.kind in out) (out as any)[e.kind] += n;
    }
    return out;
  }, [data.entries]);

  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    kind: "savings" as (typeof FINANCE_KINDS)[number],
    amount: "",
    label: "",
    occurred_on: today,
  });

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goal || ""));

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> War Chest
            </div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Fund your future, milestone by milestone.
            </h1>
            <p className="text-sm text-muted-foreground">
              Track every dollar. Cross 25 / 50 / 75 / 100% to unlock XP rewards.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setGoalInput(String(goal || ""));
                setGoalOpen(true);
              }}
            >
              <Target className="mr-1 h-4 w-4" /> Set goal
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Log entry
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="flex items-center gap-5 p-6 md:col-span-1">
            <RadialRing value={pct} size={120} label="Saved" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Goal progress
              </div>
              <div className="mt-1 font-display text-2xl font-bold">
                ${saved.toLocaleString()}
                <span className="text-base text-muted-foreground">
                  {" "}
                  / ${goal.toLocaleString() || "—"}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {goal > 0
                  ? `${Math.max(0, goal - saved).toLocaleString()} to go`
                  : "Set a goal to track milestones"}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Income
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-emerald-400">
              +${totals.income.toLocaleString()}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingDown className="h-3 w-3" /> Expenses
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-rose-400">
              −${totals.expense.toLocaleString()}
            </div>
          </GlassCard>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold">Ledger</h2>
          {(data.entries as any[]).length === 0 ? (
            <GlassCard className="p-10 text-center text-sm text-muted-foreground">
              No entries yet. Add an income, savings deposit, or expense to get started.
            </GlassCard>
          ) : (
            <GlassCard className="divide-y divide-border/40 overflow-hidden">
              {(data.entries as any[]).map((e, i) => {
                const meta = KIND_META[e.kind];
                const Icon = meta?.icon ?? Wallet;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <div
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-lg border border-border/40 bg-card/40",
                        meta?.color,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{e.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {meta?.label} · {new Date(e.occurred_on).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={cn("font-display font-bold tabular-nums", meta?.color)}>
                      {meta?.sign}${Number(e.amount).toLocaleString()}
                    </div>
                    <button
                      onClick={() => delMut.mutate({ data: { id: e.id } } as any)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </GlassCard>
          )}
        </section>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(v) => setForm({ ...form, kind: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_META[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.occurred_on}
                    onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Freelance gig, IELTS exam fee, monthly transfer..."
                />
              </div>
              <div>
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={addMut.isPending}
                onClick={async () => {
                  const amt = Number(form.amount);
                  if (!form.label.trim() || !(amt > 0)) {
                    toast.error("Label and positive amount required");
                    return;
                  }
                  await addMut.mutateAsync({
                    data: {
                      kind: form.kind,
                      amount: amt,
                      label: form.label.trim(),
                      occurred_on: form.occurred_on,
                    },
                  } as any);
                  setOpen(false);
                  setForm({ kind: "savings", amount: "", label: "", occurred_on: today });
                }}
              >
                Save entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set savings goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Target amount (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="15000"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Typical first-year overseas costs: $12K (Asia) – $40K (US/UK).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={goalMut.isPending}
                onClick={async () => {
                  const n = Number(goalInput);
                  if (!(n >= 0)) {
                    toast.error("Enter a valid amount");
                    return;
                  }
                  await goalMut.mutateAsync({ data: { goal: n } } as any);
                  setGoalOpen(false);
                }}
              >
                Save goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
