import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Send, Sparkles, Bot, User, Eraser, Zap, Gauge, ShieldCheck, Database } from "lucide-react";
import {
  chatWithMentor,
  clearMentorMessages,
  getMentorMessages,
  getMentorUsage,
} from "@/lib/mentor.functions";
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
  const loadMessages = useServerFn(getMentorMessages);
  const clearMessages = useServerFn(clearMentorMessages);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [usage, setUsage] = useState<MentorUsage | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const usageQuery = useQuery({
    queryKey: ["mentor-usage"],
    queryFn: () => loadUsage(),
  });

  const messagesQuery = useQuery({
    queryKey: ["mentor-messages"],
    queryFn: () => loadMessages(),
  });

  useEffect(() => {
    if (!messagesQuery.data) return;
    if (mut.isPending) return;
    if (messagesQuery.data.length > 0) {
      setMessages(messagesQuery.data);
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const cached = raw ? JSON.parse(raw) : [];
      if (Array.isArray(cached)) setMessages(cached);
    } catch {
      setMessages([]);
    }
  }, [messagesQuery.data, mut.isPending]);

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
      setMessages((current) => {
        const withReply: Msg[] = [...current, { role: "assistant", content: r.reply }];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(withReply.slice(-20)));
        } catch {
          /* ignore */
        }
        return withReply;
      });
      setTimeout(() => {
        messagesQuery.refetch();
      }, 0);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Mentor offline"),
  });

  const clearMut = useMutation({
    mutationFn: () => clearMessages(),
    onSuccess: () => {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      messagesQuery.refetch();
      toast.success("Mentor history cleared");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not clear mentor history"),
  });

  useEffect(() => {
    if (usageQuery.data) setUsage(usageQuery.data);
  }, [usageQuery.data]);

  const limitReached = Boolean(usage && usage.remaining <= 0);
  const canSend = Boolean(draft.trim()) && !mut.isPending && !limitReached;
  const usagePercent = usage ? Math.round((usage.used / usage.limit) * 100) : 0;

  function send(text: string) {
    const t = text.trim();
    if (!t || mut.isPending) return;
    if (limitReached) {
      toast.error("Daily mentor limit reached. Come back tomorrow for more guidance.");
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setDraft("");
    mut.mutate(next);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col gap-4">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/50 p-4 md:flex-row md:items-end md:justify-between md:p-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Tactical AI Mentor
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Commander <span className="text-gradient">Mira</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live intel, personalized to your telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 md:justify-end">
          <div className="min-w-44 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Daily messages</span>
              <span className="font-semibold text-foreground">
                {usage
                  ? `${usage.remaining}/${usage.limit}`
                  : usageQuery.isLoading
                    ? "..."
                    : "Ready"}
              </span>
            </div>
            <Progress value={usagePercent} className="mt-2 h-1.5" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              clearMut.mutate();
            }}
            disabled={messages.length === 0 || mut.isPending || clearMut.isPending}
            title="Clear chat"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid min-h-[640px] flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GlassCard className="flex min-h-[640px] flex-col overflow-hidden p-0">
          <div className="border-b border-border/50 bg-secondary/20 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent glow-primary">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-display text-base font-semibold">Mission channel</div>
                  <div className="text-xs text-muted-foreground">
                    {mut.isPending ? "Mira is analyzing your telemetry" : "Context-aware advisor"}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  limitReached
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                )}
              >
                {limitReached ? "Limit reached" : "Online"}
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
            {messages.length === 0 && (
              <div className="grid min-h-full place-items-center text-center">
                <div className="w-full max-w-2xl space-y-5">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-primary">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-semibold">
                      Standing by, Commander.
                    </div>
                    <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                      Ask for scholarship strategy, IELTS planning, document priorities, professor
                      outreach, or a weekly action plan.
                    </p>
                  </div>
                  <div className="grid gap-2 text-left sm:grid-cols-2">
                    {PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        disabled={mut.isPending || limitReached}
                        className="group flex min-h-16 items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3 py-3 text-sm transition hover:border-primary/50 hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
                        <span className="flex-1 leading-snug">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={`${m.role}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm md:max-w-[74%]",
                      m.role === "user"
                        ? "whitespace-pre-wrap rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border/60 bg-card/70 text-foreground/90",
                    )}
                  >
                    {m.role === "assistant" ? <MentorMarkdown content={m.content} /> : m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {mut.isPending && (
              <div className="flex gap-3">
                <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="w-full max-w-md space-y-2 rounded-2xl rounded-bl-md border border-border/60 bg-card/70 px-4 py-3">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="border-t border-border/50 bg-background/60 p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-secondary/20 p-2 focus-within:border-primary/60">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                placeholder={
                  limitReached ? "Daily mentor limit reached" : "Ask Mira for your next move..."
                }
                rows={2}
                className="min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={mut.isPending || limitReached}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!canSend}
                className="h-11 w-11 shrink-0 bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </GlassCard>

        <aside className="grid content-start gap-4">
          <GlassCard className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary-glow" />
              <h2 className="font-display text-base font-semibold">Usage</h2>
            </div>
            <div className="text-3xl font-bold">
              {usage ? usage.remaining : usageQuery.isLoading ? "--" : "Ready"}
              {usage && (
                <span className="text-sm font-medium text-muted-foreground"> / {usage.limit}</span>
              )}
            </div>
            <Progress value={usagePercent} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {usage
                ? `${usage.used} used today. Reset date: ${usage.resetDate}.`
                : "Daily quota will appear after sync."}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              <h2 className="font-display text-base font-semibold">Telemetry</h2>
            </div>
            <div className="grid gap-2 text-sm">
              {["Profile", "Scholarships", "IELTS", "Documents", "Finances", "Tasks"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span className="text-muted-foreground">{item}</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  </div>
                ),
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-glow" />
              <h2 className="font-display text-base font-semibold">Fast Prompts</h2>
            </div>
            <div className="grid gap-2">
              {PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={mut.isPending || limitReached}
                  className="rounded-lg border border-border/60 px-3 py-2 text-left text-xs leading-snug text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

function MentorMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<
    | { type: "heading"; level: 1 | 2 | 3; text: string }
    | { type: "paragraph"; lines: string[] }
    | { type: "list"; ordered: boolean; items: string[] }
  > = [];

  for (let i = 0; i < lines.length; ) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraph });
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const className =
            block.level === 1
              ? "font-display text-lg font-bold text-foreground"
              : block.level === 2
                ? "font-display text-base font-bold text-foreground"
                : "font-display text-sm font-bold text-foreground";
          return (
            <div key={index} className={cn(className, index > 0 && "pt-1")}>
              {renderInlineMarkdown(block.text)}
            </div>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={cn("space-y-1 pl-5", block.ordered ? "list-decimal" : "list-disc")}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={index} className="whitespace-pre-line">
            {renderInlineMarkdown(block.lines.join("\n"))}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
