import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});

type MentorProvider = "gemini" | "openai";

type MentorSnapshot = {
  profile: unknown;
  dreams: unknown[] | null;
  mocks:
    | {
        listening?: number | null;
        reading?: number | null;
        writing?: number | null;
        speaking?: number | null;
        overall?: number | null;
        taken_on?: string | null;
      }[]
    | null;
  ieltsTarget: unknown;
  unis: unknown[] | null;
  docs:
    | {
        kind?: string | null;
        status?: string | null;
        title?: string | null;
        notes?: string | null;
      }[]
    | null;
  finances: unknown[] | null;
  professors: unknown[] | null;
  deadlines: unknown[] | null;
  tasks: unknown[] | null;
  checklist: unknown[] | null;
  achievements: unknown[] | null;
  totalXp: number;
};

const DEFAULT_PROVIDER = "gemini";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-nano";
const DEFAULT_DAILY_MESSAGE_LIMIT = 12;
const DEFAULT_CONTEXT_ROW_LIMIT = 25;
const DEFAULT_MAX_OUTPUT_TOKENS = 450;

type MentorUsage = {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
};

type AuthSupabase = SupabaseClient<Database>;

function getDailyMessageLimit() {
  const parsed = Number.parseInt(process.env.MENTOR_DAILY_MESSAGE_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 100)
    : DEFAULT_DAILY_MESSAGE_LIMIT;
}

function getContextRowLimit() {
  const parsed = Number.parseInt(process.env.MENTOR_CONTEXT_ROW_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : DEFAULT_CONTEXT_ROW_LIMIT;
}

function getMaxOutputTokens() {
  const parsed = Number.parseInt(process.env.MENTOR_MAX_OUTPUT_TOKENS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 900) : DEFAULT_MAX_OUTPUT_TOKENS;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getProvider(): MentorProvider | null {
  const configured = process.env.MENTOR_AI_PROVIDER?.toLowerCase();
  if (configured === "gemini" || configured === "openai") return configured;
  if (configured === "auto") {
    if (process.env.GEMINI_API_KEY) return "gemini";
    if (process.env.OPENAI_API_KEY) return "openai";
    return null;
  }
  if (process.env.GEMINI_API_KEY) return DEFAULT_PROVIDER;
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function getTargetDegree(profile: unknown) {
  if (!profile || typeof profile !== "object") return "scholarship";
  const targetDegree = (profile as { target_degree?: unknown }).target_degree;
  return typeof targetDegree === "string" && targetDegree.trim() ? targetDegree : "scholarship";
}

function buildSystemPrompt(snapshot: MentorSnapshot) {
  return `You are Commander Mira, the AI mission mentor for Operation Global Scholar.

You coach graduates pursuing fully funded scholarships abroad. Be precise, motivating, and practical. Use second person. Keep replies under 220 words unless the user asks for depth. Use short markdown lists for plans.

Ground advice in the scholar telemetry below. Do not invent missing grades, countries, universities, deadlines, IELTS scores, scholarships, professors, documents, finances, or uploaded file contents. If important data is missing, ask one sharp clarifying question.

Scholar telemetry:
${JSON.stringify(snapshot, null, 2)}`;
}

function compactMessages(messages: z.infer<typeof MessageSchema>[]) {
  return messages
    .slice(-8)
    .map((message) => ({ ...message, content: message.content.slice(0, 1600) }));
}

function extractOpenAIText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const direct = (json as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

  const output = (json as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content.map((part) => {
        if (!part || typeof part !== "object") return "";
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      });
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractGeminiText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return "";
  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const content = (candidate as { content?: { parts?: unknown } }).content;
      if (!content || !Array.isArray(content.parts)) return [];
      return content.parts.map((part) => {
        if (!part || typeof part !== "object") return "";
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      });
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function callOpenAI(messages: z.infer<typeof MessageSchema>[], snapshot: MentorSnapshot) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      instructions: buildSystemPrompt(snapshot),
      input: compactMessages(messages).map((message) => ({
        role: message.role,
        content: message.content,
      })),
      max_output_tokens: getMaxOutputTokens(),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI mentor request failed (${response.status}). ${detail}`.trim());
  }

  const text = extractOpenAIText(await response.json());
  if (!text) throw new Error("OpenAI returned an empty mentor response.");
  return text;
}

async function callGemini(messages: z.infer<typeof MessageSchema>[], snapshot: MentorSnapshot) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(snapshot) }],
        },
        contents: compactMessages(messages).map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: getMaxOutputTokens(),
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini mentor request failed (${response.status}). ${detail}`.trim());
  }

  const text = extractGeminiText(await response.json());
  if (!text) throw new Error("Gemini returned an empty mentor response.");
  return text;
}

async function callMentorModel(
  messages: z.infer<typeof MessageSchema>[],
  snapshot: MentorSnapshot,
) {
  const provider = getProvider();
  if (!provider) return null;
  return provider === "openai" ? callOpenAI(messages, snapshot) : callGemini(messages, snapshot);
}

function toUsage(used: number, limit = getDailyMessageLimit()): MentorUsage {
  const safeUsed = Math.max(0, used);
  return {
    limit,
    used: safeUsed,
    remaining: Math.max(0, limit - safeUsed),
    resetDate: todayIso(),
  };
}

async function getUsageForToday(supabase: AuthSupabase, userId: string) {
  const { data } = await supabase
    .from("mentor_usage_daily")
    .select("messages_used")
    .eq("user_id", userId)
    .eq("usage_date", todayIso())
    .maybeSingle();

  return toUsage(data?.messages_used ?? 0);
}

async function consumeUsageForToday(supabase: AuthSupabase) {
  const limit = getDailyMessageLimit();
  const { data, error } = await supabase.rpc("consume_mentor_message", { p_limit: limit });

  if (error) throw new Error("Could not update mentor usage limit.");
  const result = data?.[0];
  if (!result?.allowed) {
    throw new Error(`Daily mentor limit reached. You can send more messages tomorrow.`);
  }

  return toUsage(result.messages_used, result.daily_limit);
}

function buildReply(question: string, snapshot: MentorSnapshot) {
  const missingDocs = snapshot.docs?.filter((d) => d.status !== "done").map((d) => d.kind) ?? [];
  const dreamCount = snapshot.dreams?.length ?? 0;
  const universityCount = snapshot.unis?.length ?? 0;
  const latestMock = snapshot.mocks?.[0];
  const target = getTargetDegree(snapshot.profile);

  if (/ielts|band|mock|exam/i.test(question)) {
    return [
      `For your IELTS track, start from the freshest score: ${latestMock?.overall ?? "no mock logged yet"}.`,
      "",
      "- Log one full mock each week.",
      "- Spend extra time on the lowest band skill before adding more general practice.",
      "- Keep writing and speaking review evidence, because those two are hardest to self-correct.",
    ].join("\n");
  }

  if (/email|professor|supervisor/i.test(question)) {
    return [
      "Use a short, specific professor email:",
      "",
      "Subject: Prospective graduate applicant interested in your research",
      "",
      `Dear Professor, I am preparing applications for ${target} programs and found your work closely aligned with my goals. I would be grateful to know whether you are considering new students for the next intake.`,
      "",
      "Attach a concise CV, mention one relevant paper or project, and keep the first email under 180 words.",
    ].join("\n");
  }

  if (/scholarship|target|shortlist/i.test(question)) {
    return [
      `You currently have ${dreamCount} scholarship target${dreamCount === 1 ? "" : "s"} and ${universityCount} universit${universityCount === 1 ? "y" : "ies"} tracked.`,
      "",
      "- Keep 3 reach, 3 match, and 2 safer options.",
      "- Prioritize programs with full funding, clear eligibility, and deadlines inside your preparation window.",
      "- Move any target without a document checklist into review before adding more.",
    ].join("\n");
  }

  if (/document|cv|sop|transcript|reference/i.test(question)) {
    return missingDocs.length
      ? `Document priority: finish ${missingDocs.slice(0, 3).join(", ")} first. These are likely to block submissions if they stay open.`
      : "Your tracked documents look clear. Use this week to polish CV impact bullets and tailor your SOP opening for each target.";
  }

  return [
    `Mission readout: ${snapshot.totalXp} XP, ${dreamCount} scholarship target${dreamCount === 1 ? "" : "s"}, and ${universityCount} universit${universityCount === 1 ? "y" : "ies"} tracked.`,
    "",
    "- Finish one application blocker today.",
    "- Add or validate one scholarship deadline.",
    "- Keep IELTS practice measurable with a dated mock or focused drill.",
  ].join("\n");
}

export const chatWithMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const usage = await consumeUsageForToday(supabase);
    const rowLimit = getContextRowLimit();
    const [
      { data: profile },
      { data: dreams },
      { data: mocks },
      { data: ieltsTarget },
      { data: unis },
      { data: docs },
      { data: finances },
      { data: professors },
      { data: deadlines },
      { data: tasks },
      { data: checklist },
      { data: achievements },
      { data: events },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "display_name,country,target_degree,target_countries,target_fields,target_departure_date,ielts_status,cv_status,has_passport,budget_goal,budget_saved,current_streak,last_checkin_date,onboarded",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("dream_scholarships")
        .select("scholarship_key,status,created_at")
        .eq("user_id", userId)
        .limit(rowLimit),
      supabase
        .from("ielts_mocks")
        .select("listening,reading,writing,speaking,overall,taken_on,notes")
        .eq("user_id", userId)
        .order("taken_on", { ascending: false })
        .limit(Math.min(rowLimit, 8)),
      supabase.from("ielts_targets").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("universities")
        .select("name,country,program,status,deadline,tuition_usd,ranking,notes")
        .eq("user_id", userId)
        .order("deadline", { ascending: true })
        .limit(rowLimit),
      supabase
        .from("documents")
        .select("kind,title,status,notes,file_path,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(rowLimit),
      supabase
        .from("finance_entries")
        .select("kind,amount,label,occurred_on")
        .eq("user_id", userId)
        .order("occurred_on", { ascending: false })
        .limit(rowLimit),
      supabase
        .from("professors")
        .select("name,university,field,status,last_contact_on,notes")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(rowLimit),
      supabase
        .from("deadlines")
        .select("title,category,due_date")
        .eq("user_id", userId)
        .order("due_date", { ascending: true })
        .limit(rowLimit),
      supabase
        .from("daily_tasks")
        .select("title,description,phase,for_date,completed,xp_reward")
        .eq("user_id", userId)
        .order("for_date", { ascending: false })
        .limit(rowLimit),
      supabase
        .from("checklist_items")
        .select("title,kind,status,due_date,notes")
        .eq("user_id", userId)
        .order("due_date", { ascending: true })
        .limit(rowLimit),
      supabase
        .from("achievements")
        .select("badge_key,unlocked_at")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false })
        .limit(rowLimit),
      supabase.from("xp_events").select("amount").eq("user_id", userId),
    ]);

    const totalXp = (events ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
    const scholarSnapshot = {
      profile,
      dreams,
      mocks,
      ieltsTarget,
      unis,
      docs: docs?.map((d) => ({
        kind: d.kind,
        title: d.title,
        status: d.status,
        notes: d.notes,
        hasFile: Boolean(d.file_path),
        updated_at: d.updated_at,
      })),
      finances,
      professors,
      deadlines,
      tasks,
      checklist,
      achievements,
      totalXp,
    };

    const modelReply = await callMentorModel(data.messages, scholarSnapshot);
    if (modelReply) return { reply: modelReply, usage };

    const lastUserMessage =
      [...data.messages].reverse().find((message) => message.role === "user")?.content ?? "";
    return { reply: buildReply(lastUserMessage, scholarSnapshot), usage };
  });

export const getMentorUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return getUsageForToday(supabase, userId);
  });
