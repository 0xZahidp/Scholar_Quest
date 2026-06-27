import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { getIelts, logMock, setIeltsTargets } from "@/lib/ielts.functions";
import { generateIeltsCoachBriefing } from "@/lib/insights.functions";
import { GlassCard } from "@/components/GlassCard";
import { RadialRing } from "@/components/RadialRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fireXp } from "@/components/xp-float-bus";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  Plus,
  TrendingUp,
  Calendar,
  Sparkles,
  Target,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  IELTS_SKILLS,
  statusColor,
  statusLabel,
  type IeltsSkill,
  computeOverall,
} from "@/lib/ielts-engine";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ielts")({
  head: () => ({ meta: [{ title: "IELTS Intelligence — Scholar Quest" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: IeltsPage,
});

const SKILL_ICONS: Record<IeltsSkill, LucideIcon> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

function IeltsPage() {
  const qc = useQueryClient();
  const fetchIelts = useServerFn(getIelts);
  const logMockFn = useServerFn(logMock);
  const setTargetsFn = useServerFn(setIeltsTargets);
  const coachFn = useServerFn(generateIeltsCoachBriefing);

  const q = useQuery({ queryKey: ["ielts"], queryFn: () => fetchIelts() });
  const coachQ = useQuery({
    queryKey: ["ielts-coach"],
    queryFn: () => coachFn(),
    enabled: (q.data?.mocks.length ?? 0) >= 1,
    staleTime: 1000 * 60 * 30,
  });

  const mockMut = useMutation({
    mutationFn: logMockFn,
    onSuccess: (r) => {
      fireXp(r.xp);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success(`Mock logged. Overall: ${r.overall}. +${r.xp} XP`);
      qc.invalidateQueries({ queryKey: ["ielts"] });
      qc.invalidateQueries({ queryKey: ["ielts-coach"] });
      qc.invalidateQueries({ queryKey: ["xp"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not log mock"),
  });

  const targetMut = useMutation({
    mutationFn: setTargetsFn,
    onSuccess: () => {
      toast.success("Targets locked in.");
      qc.invalidateQueries({ queryKey: ["ielts"] });
      qc.invalidateQueries({ queryKey: ["ielts-coach"] });
    },
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const data = q.data!;
  const a = data.analysis;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass relative overflow-hidden rounded-3xl p-6 md:p-8">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Zap className="h-3 w-3 text-cyan-400" /> IELTS Intelligence Engine
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
                Predicted band: <span className="text-gradient">{a.overall.current ?? "—"}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {a.totalMocks === 0
                  ? "Log your first mock test to ignite the adaptive engine."
                  : a.weeksToOverallTarget != null
                    ? `At your current pace, you'll hit Band ${a.overall.target} in ~${a.weeksToOverallTarget} week${a.weeksToOverallTarget === 1 ? "" : "s"}.`
                    : a.overall.status === "achieved"
                      ? `Target Band ${a.overall.target} achieved. Lock it in on exam day.`
                      : "Add more mocks to compute velocity."}
              </p>
              {a.daysUntilExam != null && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  {a.daysUntilExam > 0 ? `${a.daysUntilExam} days to exam` : "Exam day has passed"}
                  {a.willMakeExam != null && (
                    <span
                      className={cn(
                        "ml-2 rounded-md px-2 py-0.5 text-xs",
                        a.willMakeExam
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300",
                      )}
                    >
                      {a.willMakeExam ? "On schedule" : "At risk"}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              <RadialRing
                value={a.readinessPercent}
                label="Readiness"
                sub="Overall"
                color="oklch(0.78 0.18 200)"
              />
              <div className="flex flex-col justify-center gap-2">
                <LogMockDialog
                  onSubmit={(d) => mockMut.mutate({ data: d })}
                  pending={mockMut.isPending}
                />
                <TargetsDialog
                  defaults={data.targets}
                  onSubmit={(d) => targetMut.mutate({ data: d })}
                  pending={targetMut.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Per-skill cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {a.perSkill.map((s, i) => {
          const Icon = SKILL_ICONS[s.skill as IeltsSkill];
          return (
            <motion.div
              key={s.skill}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {s.skill}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest",
                    statusColor(s.status),
                  )}
                >
                  {statusLabel(s.status)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <div className="font-display text-3xl font-bold">{s.current ?? "—"}</div>
                <div className="text-sm text-muted-foreground">/ {s.target}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {s.velocityPerWeek > 0 ? `+${s.velocityPerWeek.toFixed(2)} bands/wk` : "—"}
              </div>
              {s.weeksToTarget != null && (
                <div className="mt-1 text-xs">
                  <span className="text-primary-glow">{s.weeksToTarget}</span> wk to target
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trajectory chart */}
        <GlassCard delay={0.1} className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-glow" />
              <h3 className="font-display text-lg font-semibold">Band trajectory</h3>
            </div>
            <Tabs defaultValue="overall" className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="overall" className="text-xs">
                  Overall
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">
                  All skills
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overall" className="mt-4">
                <TrajectoryChart
                  mocks={data.mocks}
                  skills={["overall"]}
                  target={a.overall.target}
                />
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <TrajectoryChart
                  mocks={data.mocks}
                  skills={IELTS_SKILLS}
                  target={a.overall.target}
                />
              </TabsContent>
            </Tabs>
          </div>
        </GlassCard>

        {/* Coach */}
        <GlassCard delay={0.15}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="font-display text-lg font-semibold">Coach</h3>
          </div>
          {coachQ.isLoading && <Skeleton className="h-32 w-full" />}
          {coachQ.data && (
            <div className="space-y-3 text-sm">
              {coachQ.data.priority_skill && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
                    <Target className="h-3 w-3" /> Priority skill
                  </div>
                  <div className="mt-1 font-display text-lg">{coachQ.data.priority_skill}</div>
                  {coachQ.data.weakness && (
                    <div className="mt-1 text-xs text-muted-foreground">{coachQ.data.weakness}</div>
                  )}
                </div>
              )}
              <p className="text-foreground/90">{coachQ.data.verdict}</p>
              {coachQ.data.weeks_to_target != null && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="text-muted-foreground">Estimated weeks to target</div>
                  <div className="font-display text-2xl font-bold text-primary-glow">
                    {coachQ.data.weeks_to_target}
                  </div>
                </div>
              )}
              {coachQ.data.daily_minutes && (
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Recommended daily practice
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(["listening", "reading", "writing", "speaking"] as const).map((s) => {
                      const Icon = SKILL_ICONS[s];
                      return (
                        <div key={s} className="rounded-lg border border-border p-2 text-center">
                          <Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                          <div className="mt-1 font-display font-semibold">
                            {coachQ.data!.daily_minutes![s]}m
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {!coachQ.data && !coachQ.isLoading && (
            <div className="text-xs text-muted-foreground">Log a mock to wake the coach.</div>
          )}
        </GlassCard>

        {/* Weakest skill alert */}
        {a.weakest && a.weakest.status !== "achieved" && (
          <GlassCard
            delay={0.2}
            className="lg:col-span-3 border border-amber-500/30 bg-amber-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <div className="font-display font-semibold capitalize">
                  Weakest skill: {a.weakest.skill}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Currently {a.weakest.current ?? "—"} vs target {a.weakest.target}.{" "}
                  {a.weakest.velocityPerWeek > 0
                    ? `Improving by ${a.weakest.velocityPerWeek.toFixed(2)} bands/week.`
                    : "No measurable improvement yet — change your practice mix this week."}
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Recent mocks */}
        <GlassCard delay={0.25} className="lg:col-span-3">
          <h3 className="mb-3 font-display text-lg font-semibold">Mock test log</h3>
          {data.mocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No mocks logged yet. Hit "Log mock test" above to start the engine.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 text-left font-medium">Date</th>
                    <th className="py-2 text-right font-medium">L</th>
                    <th className="py-2 text-right font-medium">R</th>
                    <th className="py-2 text-right font-medium">W</th>
                    <th className="py-2 text-right font-medium">S</th>
                    <th className="py-2 text-right font-medium">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.mocks].reverse().map((m) => (
                    <tr key={m.id} className="border-b border-border/40">
                      <td className="py-2">{m.taken_on}</td>
                      <td className="py-2 text-right">{m.listening}</td>
                      <td className="py-2 text-right">{m.reading}</td>
                      <td className="py-2 text-right">{m.writing}</td>
                      <td className="py-2 text-right">{m.speaking}</td>
                      <td className="py-2 text-right font-display font-bold text-gradient">
                        {m.overall}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function TrajectoryChart({
  mocks,
  skills,
  target,
}: {
  mocks: {
    taken_on: string;
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
    overall: number | null;
  }[];
  skills: (IeltsSkill | "overall")[];
  target: number;
}) {
  if (mocks.length === 0) {
    return (
      <div className="grid h-48 place-items-center text-sm text-muted-foreground">
        Log a mock to see your trajectory.
      </div>
    );
  }
  const data = mocks.map((m) => ({
    date: m.taken_on.slice(5),
    listening: m.listening,
    reading: m.reading,
    writing: m.writing,
    speaking: m.speaking,
    overall: m.overall ?? computeOverall(m),
  }));
  const colors: Record<string, string> = {
    overall: "oklch(0.78 0.18 200)",
    listening: "oklch(0.7 0.18 280)",
    reading: "oklch(0.75 0.18 160)",
    writing: "oklch(0.78 0.18 60)",
    speaking: "oklch(0.7 0.2 20)",
  };
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
          <XAxis dataKey="date" stroke="oklch(1 0 0 / 0.4)" fontSize={11} />
          <YAxis domain={[4, 9]} stroke="oklch(1 0 0 / 0.4)" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "oklch(0.18 0.04 280)",
              border: "1px solid oklch(1 0 0 / 0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={target}
            stroke="oklch(0.78 0.18 60)"
            strokeDasharray="4 4"
            label={{
              value: `Target ${target}`,
              fill: "oklch(0.78 0.18 60)",
              fontSize: 10,
              position: "right",
            }}
          />
          {skills.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={colors[s]}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 0, fill: colors[s] }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LogMockDialog({
  onSubmit,
  pending,
}: {
  onSubmit: (data: {
    taken_on: string;
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
    notes?: string | null;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [l, setL] = useState(6.5);
  const [r, setR] = useState(6.5);
  const [w, setW] = useState(6);
  const [s, setS] = useState(6.5);
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary">
          <Plus className="mr-1.5 h-4 w-4" /> Log mock test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Log mock test</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {(
            [
              ["listening", l, setL, Headphones],
              ["reading", r, setR, BookOpen],
              ["writing", w, setW, PenLine],
              ["speaking", s, setS, Mic],
            ] as const
          ).map(([name, val, setter, Icon]) => (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="flex items-center gap-1.5 capitalize">
                  <Icon className="h-3.5 w-3.5" /> {name}
                </Label>
                <span className="font-display font-bold text-gradient">{val}</span>
              </div>
              <Slider
                min={4}
                max={9}
                step={0.5}
                value={[val]}
                onValueChange={(v) => setter(v[0])}
              />
            </div>
          ))}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well?"
            />
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            Estimated overall:{" "}
            <span className="font-display text-lg font-bold text-gradient">
              {computeOverall({ listening: l, reading: r, writing: w, speaking: s })}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              onSubmit({
                taken_on: date,
                listening: l,
                reading: r,
                writing: w,
                speaking: s,
                notes: notes || null,
              });
              setOpen(false);
            }}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            Save mock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TargetsDialog({
  defaults,
  onSubmit,
  pending,
}: {
  defaults: {
    target_listening: number;
    target_reading: number;
    target_writing: number;
    target_speaking: number;
    exam_date: string | null;
  };
  onSubmit: (d: {
    target_listening: number;
    target_reading: number;
    target_writing: number;
    target_speaking: number;
    exam_date: string | null;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [l, setL] = useState(defaults.target_listening);
  const [r, setR] = useState(defaults.target_reading);
  const [w, setW] = useState(defaults.target_writing);
  const [s, setS] = useState(defaults.target_speaking);
  const [exam, setExam] = useState(defaults.exam_date ?? "");

  useEffect(() => {
    setL(defaults.target_listening);
    setR(defaults.target_reading);
    setW(defaults.target_writing);
    setS(defaults.target_speaking);
    setExam(defaults.exam_date ?? "");
  }, [defaults]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Target className="mr-1.5 h-4 w-4" /> Set targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Set targets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {(
            [
              ["listening", l, setL],
              ["reading", r, setR],
              ["writing", w, setW],
              ["speaking", s, setS],
            ] as const
          ).map(([name, val, setter]) => (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="capitalize">{name}</Label>
                <span className="font-display font-bold text-gradient">{val}</span>
              </div>
              <Slider
                min={5}
                max={9}
                step={0.5}
                value={[val]}
                onValueChange={(v) => setter(v[0])}
              />
            </div>
          ))}
          <div>
            <Label htmlFor="exam">Exam date</Label>
            <Input id="exam" type="date" value={exam} onChange={(e) => setExam(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              onSubmit({
                target_listening: l,
                target_reading: r,
                target_writing: w,
                target_speaking: s,
                exam_date: exam || null,
              });
              setOpen(false);
            }}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            Lock in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
