import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEVELS, levelFromXp } from "./xp";

export type Badge = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number; // 0-100
  hint?: string;
};

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [
      { data: events },
      { data: dreams },
      { data: unis },
      { data: docs },
      { data: mocks },
      { data: profile },
      { data: profs },
    ] = await Promise.all([
      supabase.from("xp_events").select("amount,reason").eq("user_id", userId),
      supabase.from("dream_scholarships").select("status").eq("user_id", userId),
      supabase.from("universities").select("status").eq("user_id", userId),
      supabase.from("documents").select("status,kind").eq("user_id", userId),
      supabase.from("ielts_mocks").select("overall").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("current_streak,budget_goal,budget_saved")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("professors").select("status").eq("user_id", userId),
    ]);

    const totalXp = (events ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
    const lvl = levelFromXp(totalXp);
    const bestBand = Math.max(0, ...(mocks ?? []).map((m) => Number(m.overall ?? 0)));
    const streak = profile?.current_streak ?? 0;
    const dreamsWon = (dreams ?? []).filter((d) => d.status === "won").length;
    const unisAdmitted = (unis ?? []).filter((u) => u.status === "admitted").length;
    const cvFinal = (docs ?? []).some((d) => d.kind === "cv" && d.status === "finalized");
    const sopFinal = (docs ?? []).some((d) => d.kind === "sop" && d.status === "finalized");
    const profEmailed = (profs ?? []).some((p) =>
      ["emailed", "replied", "meeting", "accepted"].includes(p.status),
    );
    const budgetPct =
      profile?.budget_goal && Number(profile.budget_goal) > 0
        ? Math.min(100, (Number(profile.budget_saved ?? 0) / Number(profile.budget_goal)) * 100)
        : 0;

    const badges: Badge[] = [
      {
        key: "first_steps",
        title: "First Steps",
        description: "Complete onboarding.",
        icon: "Rocket",
        unlocked: (events ?? []).some((e) => e.reason === "onboarding_complete"),
      },
      {
        key: "streak_7",
        title: "Week Warrior",
        description: "Maintain a 7-day streak.",
        icon: "Flame",
        unlocked: streak >= 7,
        progress: Math.min(100, (streak / 7) * 100),
        hint: `${streak}/7 days`,
      },
      {
        key: "streak_30",
        title: "Iron Will",
        description: "Maintain a 30-day streak.",
        icon: "Flame",
        unlocked: streak >= 30,
        progress: Math.min(100, (streak / 30) * 100),
        hint: `${streak}/30 days`,
      },
      {
        key: "cv_final",
        title: "Polished Profile",
        description: "Finalize your CV.",
        icon: "FileText",
        unlocked: cvFinal,
      },
      {
        key: "sop_final",
        title: "The Pen is Mighty",
        description: "Finalize your Statement of Purpose.",
        icon: "PenTool",
        unlocked: sopFinal,
      },
      {
        key: "mocks_5",
        title: "Test Veteran",
        description: "Log 5 IELTS mock tests.",
        icon: "BookOpen",
        unlocked: (mocks ?? []).length >= 5,
        progress: Math.min(100, ((mocks ?? []).length / 5) * 100),
        hint: `${(mocks ?? []).length}/5`,
      },
      {
        key: "band_7",
        title: "Band 7 Club",
        description: "Hit Band 7.0 overall in a mock.",
        icon: "Award",
        unlocked: bestBand >= 7,
        hint: `best ${bestBand.toFixed(1)}`,
      },
      {
        key: "band_8",
        title: "Elite Linguist",
        description: "Hit Band 8.0 overall.",
        icon: "Crown",
        unlocked: bestBand >= 8,
        hint: `best ${bestBand.toFixed(1)}`,
      },
      {
        key: "scholarships_3",
        title: "Hunter",
        description: "Track 3 scholarships.",
        icon: "Trophy",
        unlocked: (dreams ?? []).length >= 3,
        progress: Math.min(100, ((dreams ?? []).length / 3) * 100),
      },
      {
        key: "first_app",
        title: "Submitted",
        description: "Apply to 1 university.",
        icon: "Send",
        unlocked: (unis ?? []).some((u) => u.status === "applied" || u.status === "admitted"),
      },
      {
        key: "admit",
        title: "Admitted",
        description: "Get admitted to a university.",
        icon: "GraduationCap",
        unlocked: unisAdmitted > 0,
      },
      {
        key: "prof_outreach",
        title: "Cold Caller",
        description: "Email a professor.",
        icon: "Mail",
        unlocked: profEmailed,
      },
      {
        key: "budget_50",
        title: "Half Funded",
        description: "Save 50% of budget goal.",
        icon: "Wallet",
        unlocked: budgetPct >= 50,
        progress: budgetPct,
        hint: `${Math.round(budgetPct)}%`,
      },
      {
        key: "scholarship_won",
        title: "Champion",
        description: "Win a scholarship.",
        icon: "Sparkles",
        unlocked: dreamsWon > 0,
      },
      ...LEVELS.slice(1).map((l) => ({
        key: `level_${l.level}`,
        title: `Rank ${l.level}: ${l.title}`,
        description: `Reach ${l.xp.toLocaleString()} XP.`,
        icon: "Star",
        unlocked: totalXp >= l.xp,
        progress: Math.min(100, (totalXp / l.xp) * 100),
        hint: `${totalXp.toLocaleString()}/${l.xp.toLocaleString()} XP`,
      })),
    ];

    return {
      badges,
      totalXp,
      level: lvl.current,
      unlocked: badges.filter((b) => b.unlocked).length,
      total: badges.length,
    };
  });
