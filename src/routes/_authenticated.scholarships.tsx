import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fireXp } from "@/components/XpFloat";
import { toast } from "sonner";
import { Trophy, Search, Flame, Check, Plus, Sparkles } from "lucide-react";
import { SCHOLARSHIPS, type Scholarship } from "@/lib/scholarships";
import { getDreams, addDream } from "@/lib/dreams.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/scholarships")({
  head: () => ({ meta: [{ title: "Scholarship Vault — Operation Global Scholar" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: ScholarshipsPage,
});

function difficultyColor(d: number) {
  if (d <= 5) return "text-emerald-400";
  if (d <= 7) return "text-amber-400";
  return "text-rose-400";
}

function ScholarshipsPage() {
  const qc = useQueryClient();
  const fetchDreams = useServerFn(getDreams);
  const addFn = useServerFn(addDream);

  const dreamsQ = useQuery({ queryKey: ["dreams"], queryFn: () => fetchDreams() });
  const addMut = useMutation({
    mutationFn: addFn,
    onSuccess: (r, vars) => {
      const sch = SCHOLARSHIPS.find((s) => s.key === (vars as any).data.scholarship_key);
      if (r.added) {
        fireXp(r.xp);
        toast.success(`${sch?.name} added to dream board`, { description: `+${r.xp} XP` });
      } else {
        toast.info("Already in your dream board");
      }
      qc.invalidateQueries({ queryKey: ["dreams"] });
      qc.invalidateQueries({ queryKey: ["xp"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const dreamKeys = new Set((dreamsQ.data?.dreams ?? []).map((d: any) => d.scholarship_key));

  const [query, setQuery] = useState("");
  const [degree, setDegree] = useState<string>("all");
  const [maxDifficulty, setMaxDifficulty] = useState<string>("10");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return SCHOLARSHIPS.filter((s) => {
      if (q && !`${s.name} ${s.country} ${s.tagline}`.toLowerCase().includes(q)) return false;
      if (degree !== "all" && !s.degrees.includes(degree)) return false;
      if (s.difficulty > Number(maxDifficulty)) return false;
      return true;
    });
  }, [query, degree, maxDifficulty]);

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> Scholarship Vault
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Choose your battlefield.</h1>
          <p className="text-sm text-muted-foreground">
            Hand-picked fully-funded programs. Add to your dream board to track deadlines and earn XP.
          </p>
        </header>

        <GlassCard className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search scholarships, countries..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={degree} onValueChange={setDegree}>
              <SelectTrigger><SelectValue placeholder="Degree" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All degrees</SelectItem>
                <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                <SelectItem value="Master's">Master's</SelectItem>
                <SelectItem value="PhD">PhD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={maxDifficulty} onValueChange={setMaxDifficulty}>
              <SelectTrigger><SelectValue placeholder="Max difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Easy (≤5)</SelectItem>
                <SelectItem value="7">Moderate (≤7)</SelectItem>
                <SelectItem value="10">Any difficulty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <ScholarshipCard
              key={s.key}
              s={s}
              index={i}
              isDream={dreamKeys.has(s.key)}
              onAdd={() => addMut.mutate({ data: { scholarship_key: s.key } } as any)}
              loading={addMut.isPending}
            />
          ))}
          {filtered.length === 0 && (
            <GlassCard className="col-span-full p-12 text-center">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No matches. Widen your filters.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function ScholarshipCard({
  s, index, isDream, onAdd, loading,
}: { s: Scholarship; index: number; isDream: boolean; onAdd: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <GlassCard className="group flex h-full flex-col p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-3xl">{s.flag}</div>
            <h3 className="mt-2 font-display text-lg font-bold leading-tight">{s.name}</h3>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.country}</div>
          </div>
          <div className="text-right">
            <div className={cn("flex items-center gap-1 text-sm font-bold", difficultyColor(s.difficulty))}>
              <Flame className="h-3.5 w-3.5" /> {s.difficulty}/10
            </div>
            <div className="mt-1 text-xs text-muted-foreground">IELTS {s.ieltsMin}+</div>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{s.tagline}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.degrees.map((d) => (
            <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border/40 bg-card/40 px-2 py-1.5">
            <div className="text-muted-foreground">Stipend</div>
            <div className="font-semibold">{s.stipend}</div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/40 px-2 py-1.5">
            <div className="text-muted-foreground">Deadline</div>
            <div className="font-semibold">{new Date(s.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          {isDream ? (
            <Button disabled variant="secondary" className="w-full">
              <Check className="mr-1 h-4 w-4" /> In your dream board
            </Button>
          ) : (
            <Button onClick={onAdd} disabled={loading} className="w-full">
              <Plus className="mr-1 h-4 w-4" /> Add to dream board
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
