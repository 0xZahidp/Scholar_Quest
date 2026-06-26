import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProfile, completeOnboarding } from "@/lib/profile.functions";
import { COUNTRIES, FIELDS, TARGET_COUNTRIES } from "@/lib/scholarships";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlassCard } from "@/components/GlassCard";
import { Rocket, ChevronRight, ChevronLeft, Check, Globe2, GraduationCap, Plane, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Begin your mission — Operation Global Scholar" }] }),
  component: OnboardingPage,
});

type Form = {
  display_name: string;
  country: string;
  target_degree: "Bachelor's" | "Master's" | "PhD";
  target_countries: string[];
  target_fields: string[];
  target_departure_date: string;
  has_passport: boolean;
  budget_goal: number;
};

const STEPS = [
  { id: "identity", title: "Who are you?", icon: Rocket },
  { id: "goal", title: "Your target", icon: GraduationCap },
  { id: "destination", title: "Destination galaxies", icon: Globe2 },
  { id: "fields", title: "Field of study", icon: GraduationCap },
  { id: "logistics", title: "Mission logistics", icon: Plane },
  { id: "budget", title: "Budget command", icon: Wallet },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const submit = useServerFn(completeOnboarding);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    display_name: "",
    country: "Bangladesh",
    target_degree: "Master's",
    target_countries: [],
    target_fields: [],
    target_departure_date: "",
    has_passport: false,
    budget_goal: 5000,
  });

  useEffect(() => {
    if (profile?.onboarded) navigate({ to: "/dashboard", replace: true });
    if (profile && !profile.onboarded) {
      setForm((f) => ({ ...f, display_name: profile.display_name ?? "", country: profile.country ?? "Bangladesh" }));
    }
  }, [profile, navigate]);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          ...form,
          target_departure_date: form.target_departure_date || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Mission activated. +200 XP");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const canAdvance = () => {
    switch (STEPS[step].id) {
      case "identity": return form.display_name.trim().length > 0 && form.country.length > 0;
      case "goal": return !!form.target_degree;
      case "destination": return form.target_countries.length > 0;
      case "fields": return form.target_fields.length > 0;
      case "logistics": return true;
      case "budget": return form.budget_goal >= 0;
    }
  };

  const next = () => {
    if (!canAdvance()) return;
    if (step === STEPS.length - 1) mutation.mutate();
    else setStep((s) => s + 1);
  };

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Mission Setup</div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            Calibrate your <span className="text-gradient">command center</span>
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-gradient-to-r from-primary to-accent" : "bg-secondary",
            )}
          />
        ))}
      </div>

      <GlassCard className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent glow-primary">
                {(() => {
                  const Icon = STEPS[step].icon;
                  return <Icon className="h-5 w-5 text-white" />;
                })()}
              </div>
              <h2 className="font-display text-xl font-semibold">{STEPS[step].title}</h2>
            </div>

            {STEPS[step].id === "identity" && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Scholar callsign</Label>
                  <Input id="name" value={form.display_name} placeholder="Your name" onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                </div>
                <div>
                  <Label>Home country</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setForm({ ...form, country: c.name })}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm transition-colors",
                          form.country === c.name ? "border-primary bg-primary/10 text-foreground glow-primary" : "border-border hover:bg-secondary",
                        )}
                      >
                        {c.flag} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {STEPS[step].id === "goal" && (
              <div className="grid gap-4">
                <Label>What degree are you hunting?</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {(["Bachelor's", "Master's", "PhD"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, target_degree: d })}
                      className={cn(
                        "rounded-2xl border p-5 text-left transition-all",
                        form.target_degree === d ? "border-primary bg-primary/10 glow-primary" : "border-border hover:bg-secondary",
                      )}
                    >
                      <div className="font-display text-lg font-semibold">{d}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {d === "Bachelor's" ? "Undergraduate quest" : d === "Master's" ? "Tactical advancement" : "Research odyssey"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {STEPS[step].id === "destination" && (
              <div>
                <Label>Pick your destination countries (multi-select)</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TARGET_COUNTRIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, target_countries: toggle(form.target_countries, c) })}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                        form.target_countries.includes(c) ? "border-primary bg-primary/10 glow-primary" : "border-border hover:bg-secondary",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{form.target_countries.length} selected</p>
              </div>
            )}

            {STEPS[step].id === "fields" && (
              <div>
                <Label>Fields of study you'd commit to</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FIELDS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, target_fields: toggle(form.target_fields, f) })}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                        form.target_fields.includes(f) ? "border-accent bg-accent/10 glow-accent" : "border-border hover:bg-secondary",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {STEPS[step].id === "logistics" && (
              <div className="grid gap-5">
                <div>
                  <Label htmlFor="dep">Target departure date</Label>
                  <Input id="dep" type="date" value={form.target_departure_date} onChange={(e) => setForm({ ...form, target_departure_date: e.target.value })} />
                  <p className="mt-1 text-xs text-muted-foreground">When you want to be at your dream university.</p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <div className="font-medium">I already have a passport</div>
                    <div className="text-xs text-muted-foreground">No passport? We'll add it as a mission objective.</div>
                  </div>
                  <Switch checked={form.has_passport} onCheckedChange={(v) => setForm({ ...form, has_passport: v })} />
                </div>
              </div>
            )}

            {STEPS[step].id === "budget" && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="goal">Application budget goal (USD)</Label>
                  <Input id="goal" type="number" min={0} value={form.budget_goal} onChange={(e) => setForm({ ...form, budget_goal: Number(e.target.value || 0) })} />
                  <p className="mt-1 text-xs text-muted-foreground">Covers IELTS, app fees, document attestation, courier, travel. Don't worry — we'll help you plan.</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={next}
                disabled={!canAdvance() || mutation.isPending}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
              >
                {step === STEPS.length - 1 ? (
                  <>
                    <Check className="mr-1 h-4 w-4" /> Activate mission
                  </>
                ) : (
                  <>
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}
