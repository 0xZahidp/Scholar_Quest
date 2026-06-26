import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { levelFromXp } from "./xp";

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [
      { data: events },
      { data: tasks },
      { data: dreams },
      { data: unis },
      { data: docs },
      { data: mocks },
      { data: profile },
    ] = await Promise.all([
      supabase.from("xp_events").select("amount,reason,created_at").eq("user_id", userId),
      supabase.from("daily_tasks").select("completed").eq("user_id", userId),
      supabase.from("dream_scholarships").select("status").eq("user_id", userId),
      supabase.from("universities").select("status").eq("user_id", userId),
      supabase.from("documents").select("status").eq("user_id", userId),
      supabase
        .from("ielts_mocks")
        .select("overall,taken_on")
        .eq("user_id", userId)
        .order("taken_on"),
      supabase
        .from("profiles")
        .select("budget_goal,budget_saved,current_streak")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const totalXp = (events ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
    const level = levelFromXp(totalXp);

    // Bucket XP per day (last 30 days)
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      days[d] = 0;
    }
    for (const e of events ?? []) {
      const d = (e.created_at ?? "").slice(0, 10);
      if (d in days) days[d] += e.amount ?? 0;
    }
    const xpTimeline = Object.entries(days).map(([date, xp]) => ({ date: date.slice(5), xp }));

    // XP by reason
    const byReason: Record<string, number> = {};
    for (const e of events ?? []) byReason[e.reason] = (byReason[e.reason] ?? 0) + (e.amount ?? 0);
    const xpByReason = Object.entries(byReason)
      .map(([reason, xp]) => ({ reason, xp }))
      .sort((a, b) => b.xp - a.xp);

    return {
      totalXp,
      level: level.current,
      nextLevel: level.next,
      progress: level.progress,
      streak: profile?.current_streak ?? 0,
      counts: {
        tasksCompleted: (tasks ?? []).filter((t) => t.completed).length,
        dreams: (dreams ?? []).length,
        dreamsWon: (dreams ?? []).filter((d) => d.status === "won").length,
        unisApplied: (unis ?? []).filter((u) => u.status === "applied" || u.status === "admitted")
          .length,
        unisAdmitted: (unis ?? []).filter((u) => u.status === "admitted").length,
        docsFinal: (docs ?? []).filter((d) => d.status === "finalized").length,
        mocks: (mocks ?? []).length,
      },
      budget: {
        goal: Number(profile?.budget_goal ?? 0),
        saved: Number(profile?.budget_saved ?? 0),
      },
      xpTimeline,
      xpByReason,
      mockTrend: (mocks ?? []).map((m) => ({ date: m.taken_on, overall: Number(m.overall ?? 0) })),
    };
  });
