import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Send, Sparkles, Bot, User, Eraser, Zap } from "lucide-react";
import { chatWithMentor, getMentorUsage } from "@/lib/mentor.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "AI Mentor — Operation Global Scholar" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: MentorPage,
});

type Msg = { role: "user" | "assistant"; content: string };
type MentorUsage = { limit: number; used: number; remaining: number; resetDate: string };

const STORAGE_KEY = "ogs:mentor:history";

const PROMPTS = [
  "Audit my profile and tell me the #1 thing to fix this week.",
  "Which 3 scholarships should I target first given my data?",
  "What's a realistic IELTS prep plan to hit my target band?",
  "Draft a cold email template for a professor at my target uni.",
];

function MentorPage() {
  const chat = useServerFn(chatWithMentor);
  const loadUsage = useServerFn(getMentorUsage);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [usage, setUsage] = useState<MentorUsage | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const usageQuery = useQuery({
    queryKey: ["mentor-usage"],
    queryFn: () => loadUsage(),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      /* ignore */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const mut = useMutation({
    mutationFn: (history: Msg[]) => chat({ data: { messages: history } }),
    onSuccess: (r) => {
      setUsage(r.usage);
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Mentor offline"),
  });

  useEffect(() => {
    if (usageQuery.data) setUsage(usageQuery.data);
  }, [usageQuery.data]);

  function send(text: string) {
    const t = text.trim();
    if (!t || mut.isPending) return;
    if (usage && usage.remaining <= 0) {
      toast.error("Daily mentor limit reached. Come back tomorrow for more guidance.");
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setDraft("");
    mut.mutate(next);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Tactical AI Mentor
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Commander <span className="text-gradient">Mira</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Live intel, personalized to your telemetry.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
            {usage
              ? `${usage.remaining}/${usage.limit} messages left today`
              : usageQuery.isLoading
                ? "Checking today's messages..."
                : "Daily limit ready"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([]);
              localStorage.removeItem(STORAGE_KEY);
            }}
            disabled={messages.length === 0 || mut.isPending}
          >
            <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </header>

      <GlassCard className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center">
              <div className="max-w-md space-y-4">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-primary">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="font-display text-lg font-semibold">Standing by, Commander.</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ask anything about your scholarship campaign. I see your IELTS scores, dreams,
                    documents, and stats in real time.
                  </p>
                </div>
                <div className="grid gap-2 text-left">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      disabled={mut.isPending || Boolean(usage && usage.remaining <= 0)}
                      className="group flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-sm transition hover:border-primary/50 hover:bg-secondary/60"
                    >
                      <Zap className="h-3.5 w-3.5 text-primary-glow" />
                      <span className="flex-1">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 bg-card/60 text-foreground/90",
                  )}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-secondary">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {mut.isPending && (
            <div className="flex gap-3">
              <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="max-w-[60%] space-y-1.5 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="border-t border-border/40 bg-background/40 p-3"
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Brief the Commander…  (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="min-h-[44px] resize-none"
              disabled={mut.isPending || Boolean(usage && usage.remaining <= 0)}
            />
            <Button
              type="submit"
              disabled={!draft.trim() || mut.isPending || Boolean(usage && usage.remaining <= 0)}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
