import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MissionBriefing = {
  level: "Recruit" | "Explorer" | "Strategist" | "Finalist";
  summary: string;
  priorities: { title: string; why: string }[];
  risks: { severity: "critical" | "warning" | "caution"; title: string; action: string }[];
  timeline_weeks: number;
};

type CoachBriefing = {
  priority_skill: "listening" | "reading" | "writing" | "speaking" | null;
  verdict: string;
  weeks_to_target: number | null;
  daily_minutes: { listening: number; reading: number; writing: number; speaking: number };
  weakness: string | null;
};

type ProfileSummary = {
  target_degree?: string | null;
  target_country?: string | null;
  target_field?: string | null;
};

type DreamSummary = {
  scholarship_key?: string | null;
};

type MockSummary = {
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
  overall?: number | null;
};

type IeltsTargetSummary = {
  target_listening?: number | null;
  target_reading?: number | null;
  target_writing?: number | null;
  target_speaking?: number | null;
  overall_target?: number | null;
};

function missionLevel(
  profile: ProfileSummary | null,
  dreams: DreamSummary[] | null,
  mocks: MockSummary[] | null,
): MissionBriefing["level"] {
  const hasProfile = Boolean(
    profile?.target_degree || profile?.target_country || profile?.target_field,
  );
  const dreamCount = dreams?.length ?? 0;
  const mockCount = mocks?.length ?? 0;
  if (dreamCount >= 5 && mockCount >= 3) return "Finalist";
  if (dreamCount >= 3 && hasProfile) return "Strategist";
  if (dreamCount > 0 || mockCount > 0 || hasProfile) return "Explorer";
  return "Recruit";
}

function buildMissionBriefing(
  profile: ProfileSummary | null,
  dreams: DreamSummary[] | null,
  mocks: MockSummary[] | null,
): MissionBriefing {
  const level = missionLevel(profile, dreams, mocks);
  const priorities = [
    {
      title: "Lock your scholarship shortlist",
      why: "A focused list keeps deadlines, essays, and document prep manageable.",
    },
    {
      title: "Update your document tracker",
      why: "CV, transcripts, references, and SOP drafts drive most application timelines.",
    },
    {
      title: "Log your latest IELTS mock",
      why: "Fresh band data gives you a clearer weekly practice target.",
    },
  ];
  const risks: MissionBriefing["risks"] = [];

  if (!profile?.target_degree || !profile?.target_country) {
    risks.push({
      severity: "warning",
      title: "Profile incomplete",
      action: "Finish onboarding with target degree, country, and field.",
    });
  }
  if ((dreams?.length ?? 0) < 3) {
    risks.push({
      severity: "caution",
      title: "Shortlist too small",
      action: "Add at least three scholarships or universities this week.",
    });
  }
  if ((mocks?.length ?? 0) === 0) {
    risks.push({
      severity: "caution",
      title: "IELTS baseline missing",
      action: "Log one mock test to establish your starting band.",
    });
  }

  return {
    level,
    summary: `You are at ${level} stage. Keep the next week focused on shortlist quality, document readiness, and IELTS evidence.`,
    priorities,
    risks: risks.slice(0, 2),
    timeline_weeks:
      level === "Finalist" ? 4 : level === "Strategist" ? 8 : level === "Explorer" ? 12 : 16,
  };
}

function buildCoachBriefing(
  mocks: MockSummary[],
  target: IeltsTargetSummary | null,
): CoachBriefing {
  if (!mocks.length) {
    return {
      priority_skill: null,
      verdict: "Log your first mock test to activate the coach.",
      weeks_to_target: null,
      daily_minutes: { listening: 20, reading: 20, writing: 30, speaking: 20 },
      weakness: null,
    };
  }

  const latest = mocks[mocks.length - 1];
  const skills = ["listening", "reading", "writing", "speaking"] as const;
  const gaps = skills
    .map((skill) => {
      const targetValue = target?.[`target_${skill}`] ?? target?.overall_target ?? 7;
      const current = latest?.[skill] ?? 0;
      return { skill, gap: targetValue - current, current, target: targetValue };
    })
    .sort((a, b) => b.gap - a.gap);
  const weakest = gaps[0];
  const maxGap = Math.max(0, weakest.gap);

  return {
    priority_skill: weakest.skill,
    weakness: `${weakest.skill} is ${weakest.current || "unlogged"} against a target of ${weakest.target}.`,
    verdict:
      maxGap > 0
        ? `Prioritize ${weakest.skill} this week and keep one full mock in the schedule. Small weekly gains compound fastest when practice is targeted.`
        : "Your latest mock meets the current target. Shift effort toward consistency and exam-day timing.",
    weeks_to_target: maxGap > 0 ? Math.max(2, Math.ceil(maxGap / 0.25)) : 0,
    daily_minutes: {
      listening: weakest.skill === "listening" ? 35 : 20,
      reading: weakest.skill === "reading" ? 35 : 20,
      writing: weakest.skill === "writing" ? 45 : 30,
      speaking: weakest.skill === "speaking" ? 35 : 20,
    },
  };
}

export const generateMissionBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: dreams }, { data: mocks }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("dream_scholarships").select("scholarship_key").eq("user_id", userId),
      supabase
        .from("ielts_mocks")
        .select("*")
        .eq("user_id", userId)
        .order("taken_on", { ascending: false })
        .limit(5),
    ]);

    const briefing = buildMissionBriefing(profile, dreams, mocks);

    const { error } = await supabase
      .from("ai_briefings")
      .insert({ user_id: userId, kind: "mission", content: briefing });
    if (error) throw error;
    return briefing;
  });

export const generateIeltsCoachBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: mocks }, { data: target }] = await Promise.all([
      supabase
        .from("ielts_mocks")
        .select("*")
        .eq("user_id", userId)
        .order("taken_on", { ascending: true }),
      supabase.from("ielts_targets").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (!mocks || mocks.length < 1) {
      return {
        priority_skill: null,
        verdict: "Log your first mock test to activate the coach.",
        weeks_to_target: null,
        daily_minutes: { listening: 20, reading: 20, writing: 30, speaking: 20 },
        weakness: null,
      };
    }

    return buildCoachBriefing(mocks, target);
  });
