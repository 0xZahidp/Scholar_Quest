import { createServerFn } from "@tanstack/react-start";
import { awardXp } from "./xp-award.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS, levelFromXp } from "./xp";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_TASK_TEMPLATES = [
  { title: "Daily check-in", description: "Open mission control and review priorities.", xp_reward: XP_REWARDS.daily_login, phase: "core" },
  { title: "30 min IELTS practice", description: "Listening, reading, writing or speaking — your call.", xp_reward: XP_REWARDS.task_complete, phase: "ielts" },
  { title: "Research 1 scholarship", description: "Read 1 scholarship deeply. Note deadline + requirements.", xp_reward: XP_REWARDS.scholarship_researched, phase: "research" },
];

export const getXpSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: events }, { data: profile }] = await Promise.all([
      supabase.from("xp_events").select("amount,reason,created_at").eq("user_id", userId),
      supabase.from("profiles").select("current_streak,last_checkin_date").eq("id", userId).maybeSingle(),
    ]);
    const totalXp = (events ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
    return {
      totalXp,
      ...levelFromXp(totalXp),
      streak: profile?.current_streak ?? 0,
      lastCheckin: profile?.last_checkin_date ?? null,
      recent: (events ?? []).slice(-5).reverse(),
    };
  });

export const getDailyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const date = today();
    let { data } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("for_date", date)
      .order("created_at", { ascending: true });
    if (!data || data.length === 0) {
      const rows = DEFAULT_TASK_TEMPLATES.map((t) => ({ ...t, user_id: userId, for_date: date }));
      const insert = await supabase.from("daily_tasks").insert(rows).select("*");
      data = insert.data ?? [];
    }
    return data;
  });

const CompleteSchema = z.object({ id: z.string().uuid() });

export const completeDailyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: task, error } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!task) throw new Error("Task not found");
    if (task.completed) return { xp: 0, alreadyDone: true };

    await supabase
      .from("daily_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", task.id);

    const xp = task.xp_reward ?? XP_REWARDS.task_complete;
    await awardXp(userId, xp, "task_complete", { task_id: task.id, title: task.title });
    return { xp, alreadyDone: false };
  });

export const dailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const date = today();
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak,last_checkin_date")
      .eq("id", userId)
      .maybeSingle();

    const last = profile?.last_checkin_date;
    if (last === date) return { xp: 0, streak: profile?.current_streak ?? 0, alreadyDone: true };

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = last === yesterday ? (profile?.current_streak ?? 0) + 1 : 1;

    await supabase
      .from("profiles")
      .update({ last_checkin_date: date, current_streak: streak, updated_at: new Date().toISOString() })
      .eq("id", userId);

    const xp = XP_REWARDS.daily_login;
    await awardXp(userId, xp, "daily_login", { streak });

    return { xp, streak, alreadyDone: false };
  });
