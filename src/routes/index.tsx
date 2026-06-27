import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { StarField } from "@/components/StarField";
import { Rocket, Target, Trophy, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scholar Quest — Mission Control for Future Scholars" },
      {
        name: "description",
        content:
          "From graduation to global opportunity. The tactical command center for winning fully-funded scholarships abroad.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField density={120} />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent glow-primary">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold">Scholar Quest</span>
        </div>
        <Link
          to="/auth"
          search={{ mode: "signin" }}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Sign in
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16 text-center md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Mission control for future scholars
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            From graduation to <br />
            <span className="text-gradient">global opportunity.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Win a fully-funded Bachelor's, Master's, or PhD scholarship abroad. Your mission
            dashboard tracks every deadline, document, and IELTS band so you can focus on becoming
            unstoppable.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.62_0.22_280_/_0.7)] transition-transform hover:scale-105"
            >
              Begin mission{" "}
              <Rocket className="h-4 w-4 transition-transform group-hover:-rotate-12 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-border px-6 py-3 font-medium hover:bg-secondary"
            >
              See the system
            </a>
          </div>
        </motion.div>

        <div id="features" className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Adaptive IELTS Coach",
              body: "Log mocks. Get tactical analysis. Hit your target band on schedule.",
            },
            {
              icon: Trophy,
              title: "Gamified Progression",
              body: "10 levels. XP for every win. Celebration on every breakthrough.",
            },
            {
              icon: Sparkles,
              title: "Mission Briefings",
              body: "Personalized risk detection and weekly priorities based on your progress.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
              className="glass rounded-2xl p-6 text-left"
            >
              <f.icon className="h-6 w-6 text-primary-glow" />
              <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
