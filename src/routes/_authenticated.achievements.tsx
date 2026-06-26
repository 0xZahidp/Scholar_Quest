import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getAchievements } from "@/lib/achievements.functions";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [{ title: "Achievements — OGS" }] }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const fn = useServerFn(getAchievements);
  const q = useQuery({ queryKey: ["achievements"], queryFn: () => fn() });

  if (q.isLoading || !q.data) {
    return <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  }
  const { badges, unlocked, total, totalXp, level } = q.data;
  const pct = Math.round((unlocked / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Hall of Honor</div>
        <h1 className="font-display text-3xl font-bold">Achievements</h1>
        <p className="mt-1 text-sm text-muted-foreground">{unlocked} of {total} badges unlocked · Level {level.level} · {totalXp.toLocaleString()} XP</p>
      </div>

      <GlassCard>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Collection progress</span>
          <span className="text-primary-glow">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {badges.map((b, i) => {
          const Icon = (Icons as any)[b.icon] ?? Icons.Award;
          return (
            <motion.div key={b.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`group relative overflow-hidden rounded-2xl border p-5 ${
                b.unlocked ? "border-primary/40 bg-gradient-to-br from-primary/10 via-card/60 to-accent/10" : "border-border bg-card/30 opacity-70"
              }`}>
              {b.unlocked && <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />}
              <div className="relative flex items-start gap-3">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                  b.unlocked ? "bg-gradient-to-br from-primary to-accent glow-primary" : "bg-secondary/40 grayscale"
                }`}>
                  <Icon className={`h-6 w-6 ${b.unlocked ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-display font-semibold ${b.unlocked ? "" : "text-muted-foreground"}`}>{b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.description}</div>
                  {b.progress != null && !b.unlocked && (
                    <div className="mt-2">
                      <Progress value={b.progress} className="h-1" />
                      {b.hint && <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{b.hint}</div>}
                    </div>
                  )}
                  {b.unlocked && <div className="mt-1 text-[10px] uppercase tracking-widest text-primary-glow">Unlocked</div>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
