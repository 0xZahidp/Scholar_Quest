import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { getProfile } from "@/lib/profile.functions";
import { getXpSummary, getDailyTasks, completeDailyTask, dailyCheckin } from "@/lib/xp.functions";
import { getIelts } from "@/lib/ielts.functions";
import { generateMissionBriefing } from "@/lib/insights.functions";
import { GlassCard } from "@/components/GlassCard";
import { RadialRing } from "@/components/RadialRing";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fireXp } from "@/components/xp-float-bus";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Flame,
  CheckCircle2,
  Circle,
  Sparkles,
  AlertTriangle,
  Target,
  ArrowRight,
  BookOpen,
  Calendar,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Mission Control — Operation Global Scholar" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: DashboardPage,
});

function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getProfile);
  const fetchXp = useServerFn(getXpSummary);
  const fetchTasks = useServerFn(getDailyTasks);
  const fetchIelts = useServerFn(getIelts);
  const briefingFn = useServerFn(generateMissionBriefing);
  const completeFn = useServerFn(completeDailyTask);
  const checkinFn = useServerFn(dailyCheckin);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const xpQ = useQuery({ queryKey: ["xp"], queryFn: () => fetchXp() });
  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const ieltsQ = useQuery({ queryKey: ["ielts"], queryFn: () => fetchIelts() });
  const briefingQ = useQuery({
    queryKey: ["briefing"],
    queryFn: () => briefingFn(),
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (profileQ.data && !profileQ.data.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profileQ.data, navigate]);

  const completeMut = useMutation({
    mutationFn: (id: string) => completeFn({ data: { id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["xp"] });
      if (r.alreadyDone) {
        toast("Already checked in today, Commander.");
        return;
      }
      fireXp(r.xp);
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not complete"),
  });

  const checkinMut = useMutation({
    mutationFn: () => checkinFn(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["xp"] });
      if (r.alreadyDone) {
        toast("Already checked in today, Commander.");
        return;
      }
      fireXp(r.xp);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      toast.success(`Streak: ${r.streak} day${r.streak === 1 ? "" : "s"}. +${r.xp} XP`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not check in"),
  });

  const today = new Date().toISOString().slice(0, 10);
  const dailyCheckinTask = tasksQ.data?.find(
    (task) => task.title?.toLowerCase() === "daily check-in" || task.phase === "core",
  );
  const alreadyCheckedIn = xpQ.data?.lastCheckin === today || Boolean(dailyCheckinTask?.completed);
  const readiness = ieltsQ.data?.analysis?.readinessPercent ?? 0;
  const profile = profileQ.data;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass relative overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Mission Control
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
                {greeting()},{" "}
                <span className="text-gradient">{profile?.display_name ?? "Scholar"}</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {xpQ.data
                  ? `Level ${xpQ.data.current.level} · ${xpQ.data.current.title}`
                  : "Calibrating telemetry…"}
                {profile?.target_degree ? ` · Hunting a ${profile.target_degree}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => checkinMut.mutate()}
                  disabled={alreadyCheckedIn || checkinMut.isPending}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
                >
                  <Flame className="mr-1.5 h-4 w-4" />
                  {alreadyCheckedIn ? "Checked in" : "Daily check-in"}
                </Button>
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-sm">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-semibold">{xpQ.data?.streak ?? 0}</span>
                  <span className="text-muted-foreground">day streak</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <RadialRing value={xpQ.data?.progress ?? 0} label="Level Progress" sub="XP" />
              <RadialRing
                value={readiness}
                label="IELTS Readiness"
                sub="Band"
                color="oklch(0.78 0.18 200)"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level bar */}
      <GlassCard delay={0.1}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Rank progression
            </div>
            <div className="font-display text-lg font-semibold">
              {xpQ.data?.current.title}
              <span className="ml-2 text-sm text-muted-foreground">→ {xpQ.data?.next.title}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {xpQ.data ? `${xpQ.data.totalXp} / ${xpQ.data.next.xp} XP` : ""}
          </div>
        </div>
        <Progress value={xpQ.data?.progress ?? 0} className="mt-3 h-2" />
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Tasks */}
        <GlassCard delay={0.15} className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Today's missions</h3>
            <span className="text-xs text-muted-foreground">
              {tasksQ.data?.filter((t) => t.completed).length ?? 0} / {tasksQ.data?.length ?? 0}{" "}
              cleared
            </span>
          </div>
          <div className="space-y-2">
            {tasksQ.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            {tasksQ.data?.map((t) => (
              <button
                key={t.id}
                onClick={() => !t.completed && completeMut.mutate(t.id)}
                disabled={t.completed || completeMut.isPending}
                className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  t.completed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border hover:bg-secondary/50 hover:border-primary/50"
                }`}
              >
                {t.completed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
                )}
                <div className="flex-1">
                  <div className={`font-medium ${t.completed ? "line-through opacity-60" : ""}`}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  )}
                </div>
                <div className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-glow">
                  +{t.xp_reward} XP
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Mission Briefing */}
        <GlassCard delay={0.2}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-glow" />
            <h3 className="font-display text-lg font-semibold">Intel Briefing</h3>
          </div>
          {briefingQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : briefingQ.data ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs uppercase tracking-widest text-primary-glow">
                {briefingQ.data.level}
              </div>
              <p className="text-foreground/90">{briefingQ.data.summary}</p>
              <div className="space-y-1.5">
                {briefingQ.data.priorities?.slice(0, 3).map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <div>
                      <div className="text-xs font-semibold">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground">{p.why}</div>
                    </div>
                  </div>
                ))}
              </div>
              {briefingQ.data.risks?.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <div>
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-muted-foreground">{r.action}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : briefingQ.error ? (
            <div className="text-xs text-muted-foreground">Intel offline. Retry in a moment.</div>
          ) : null}
        </GlassCard>

        {/* IELTS Snapshot */}
        <GlassCard delay={0.25} className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-glow" />
              <h3 className="font-display text-lg font-semibold">IELTS Intelligence</h3>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ielts">
                Open <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          {ieltsQ.data && ieltsQ.data.mocks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {ieltsQ.data.analysis.perSkill.map((s) => (
                <div key={s.skill} className="rounded-xl border border-border p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s.skill}
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold">
                    {s.current ?? "—"}
                    <span className="ml-1 text-xs text-muted-foreground">/ {s.target}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {s.weeksToTarget != null
                      ? `${s.weeksToTarget} wk to target`
                      : s.status === "achieved"
                        ? "✓ achieved"
                        : "log more mocks"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No mock tests logged.{" "}
              <Link to="/ielts" className="text-primary-glow underline">
                Activate the IELTS engine →
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Quick Stats */}
        <GlassCard delay={0.3}>
          <h3 className="mb-3 font-display text-lg font-semibold">Mission Stats</h3>
          <div className="space-y-2 text-sm">
            <Stat icon={Trophy} label="Total XP" value={xpQ.data?.totalXp ?? 0} />
            <Stat icon={Flame} label="Current streak" value={`${xpQ.data?.streak ?? 0} d`} />
            <Stat icon={BookOpen} label="Mocks logged" value={ieltsQ.data?.mocks.length ?? 0} />
            <Stat
              icon={Calendar}
              label="Days to exam"
              value={ieltsQ.data?.analysis.daysUntilExam ?? "—"}
            />
            <Stat icon={Target} label="Level" value={`${xpQ.data?.current.level ?? 1}`} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-display font-semibold">{value}</span>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late, Commander";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late shift";
}
