import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  BarChart, Bar, LineChart, Line,
} from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getAnalytics } from "@/lib/analytics.functions";
import { Trophy, BookOpen, Send, GraduationCap, FileText, Wallet, Flame, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Scholar Quest" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fn = useServerFn(getAnalytics);
  const q = useQuery({ queryKey: ["analytics"], queryFn: () => fn() });

  if (q.isLoading || !q.data) {
    return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
  }
  const d = q.data;
  const budgetPct = d.budget.goal > 0 ? Math.min(100, (d.budget.saved / d.budget.goal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Mission Telemetry</div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Read your trajectory. Adjust your strategy.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi icon={Trophy} label="Total XP" value={d.totalXp.toLocaleString()} sub={`Level ${d.level.level} · ${d.level.title}`} />
        <Kpi icon={Flame} label="Streak" value={`${d.streak}d`} sub="daily check-in" />
        <Kpi icon={Send} label="Applications" value={d.counts.unisApplied} sub={`${d.counts.unisAdmitted} admitted`} />
        <Kpi icon={Sparkles} label="Scholarships" value={d.counts.dreams} sub={`${d.counts.dreamsWon} won`} />
      </div>

      <GlassCard>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Rank progression</div>
            <div className="font-display text-lg font-semibold">{d.level.title} → {d.nextLevel.title}</div>
          </div>
          <div className="text-sm text-muted-foreground">{d.totalXp.toLocaleString()} / {d.nextLevel.xp.toLocaleString()} XP</div>
        </div>
        <Progress value={d.progress} className="h-2" />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard delay={0.1} className="lg:col-span-2">
          <h3 className="mb-3 font-display text-lg font-semibold">XP earned · last 30 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.xpTimeline}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="oklch(0.6 0.02 270)" fontSize={10} />
              <YAxis stroke="oklch(0.6 0.02 270)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.16 0.04 270)", border: "1px solid oklch(0.3 0.05 270)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" stroke="oklch(0.78 0.18 290)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard delay={0.15}>
          <h3 className="mb-3 font-display text-lg font-semibold">XP by source</h3>
          {d.xpByReason.length === 0 ? (
            <div className="text-sm text-muted-foreground">No XP yet — complete a daily task.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.xpByReason.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" stroke="oklch(0.6 0.02 270)" fontSize={10} />
                <YAxis type="category" dataKey="reason" stroke="oklch(0.6 0.02 270)" fontSize={10} width={110} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.04 270)", border: "1px solid oklch(0.3 0.05 270)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="xp" fill="oklch(0.78 0.18 200)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard delay={0.2} className="lg:col-span-2">
          <h3 className="mb-3 font-display text-lg font-semibold">IELTS overall band trend</h3>
          {d.mockTrend.length === 0 ? (
            <div className="text-sm text-muted-foreground">Log mock tests in the IELTS Center to populate this chart.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.mockTrend}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="oklch(0.6 0.02 270)" fontSize={10} />
                <YAxis domain={[4, 9]} stroke="oklch(0.6 0.02 270)" fontSize={10} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.04 270)", border: "1px solid oklch(0.3 0.05 270)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="overall" stroke="oklch(0.82 0.16 150)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard delay={0.25}>
          <h3 className="mb-3 font-display text-lg font-semibold">Pipeline</h3>
          <div className="space-y-2 text-sm">
            <Row icon={FileText} label="Documents final" value={d.counts.docsFinal} />
            <Row icon={BookOpen} label="Mocks logged" value={d.counts.mocks} />
            <Row icon={GraduationCap} label="Admitted" value={d.counts.unisAdmitted} />
            <Row icon={Wallet} label="Budget" value={`${Math.round(budgetPct)}%`} />
          </div>
          <div className="mt-3">
            <Progress value={budgetPct} className="h-1.5" />
            <div className="mt-1 text-[11px] text-muted-foreground">
              ${d.budget.saved.toLocaleString()} / ${d.budget.goal.toLocaleString()}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        {label} <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </GlassCard>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-display font-semibold">{value}</span>
    </div>
  );
}
