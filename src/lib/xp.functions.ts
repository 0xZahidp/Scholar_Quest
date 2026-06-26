import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS, levelFromXp } from "./xp";
import { awardUserXp } from "./xp-award";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_TASK_TEMPLATES = [
  {
    title: "Daily check-in",
    description: "Open mission control and review priorities.",
    xp_reward: XP_REWARDS.daily_login,
    phase: "core",
  },
  {
    title: "30 min IELTS practice",
    description: "Listening, reading, writing or speaking — your call.",
    xp_reward: XP_REWARDS.task_complete,
    phase: "ielts",
  },
  {
    title: "Research 1 scholarship",
    description: "Read 1 scholarship deeply. Note deadline + requirements.",
    xp_reward: XP_REWARDS.scholarship_researched,
    phase: "research",
  },
];

async function ensureDailyTasks(supabase: any, userId: string, date: string) {
  let { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("for_date", date)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    const rows = DEFAULT_TASK_TEMPLATES.map((task) => ({
      ...task,
      user_id: userId,
      for_date: date,
    }));
    const insert = await supabase.from("daily_tasks").insert(rows).select("*");
    if (insert.error) throw insert.error;
    data = insert.data ?? [];
  }

  return data;
}

function isDailyCheckinTask(task: { title?: string | null; phase?: string | null }) {
  return task.title?.toLowerCase() === "daily check-in" || task.phase === "core";
}

async function markDailyCheckinTaskComplete(
  supabase: any,
  userId: string,
  date: string,
  taskId?: string,
) {
  const completed_at = new Date().toISOString();
  let query = supabase
    .from("daily_tasks")
    .update({ completed: true, completed_at })
    .eq("user_id", userId)
    .eq("for_date", date)
    .eq("completed", false);

  query = taskId ? query.eq("id", taskId) : query.eq("title", "Daily check-in").eq("phase", "core");

  const { error } = await query;
  if (error) throw error;
}

async function performDailyCheckin(supabase: any, userId: string, taskId?: string) {
  const date = today();
  await ensureDailyTasks(supabase, userId, date);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_streak,last_checkin_date")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const last = profile?.last_checkin_date;
  if (last === date) {
    await markDailyCheckinTaskComplete(supabase, userId, date, taskId);
    return { xp: 0, streak: profile?.current_streak ?? 0, alreadyDone: true };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = last === yesterday ? (profile?.current_streak ?? 0) + 1 : 1;

  const { error: updateError } = await supabase.from("profiles").upsert({
    id: userId,
    last_checkin_date: date,
    current_streak: streak,
    updated_at: new Date().toISOString(),
  });
  if (updateError) throw updateError;

  await markDailyCheckinTaskComplete(supabase, userId, date, taskId);

  const xp = XP_REWARDS.daily_login;
  await awardUserXp(supabase, userId, xp, "daily_login", { streak });

  return { xp, streak, alreadyDone: false };
}

export const getXpSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: events }, { data: profile }] = await Promise.all([
      supabase.from("xp_events").select("amount,reason,created_at").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("current_streak,last_checkin_date")
        .eq("id", userId)
        .maybeSingle(),
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
    return ensureDailyTasks(supabase, userId, date);
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

    if (isDailyCheckinTask(task)) {
      return performDailyCheckin(supabase, userId, task.id);
    }

    const { error: updateError } = await supabase
      .from("daily_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (updateError) throw updateError;

    const xp = task.xp_reward ?? XP_REWARDS.task_complete;
    await awardUserXp(supabase, userId, xp, "task_complete", {
      task_id: task.id,
      title: task.title,
    });
    return { xp, alreadyDone: false };
  });

export const dailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return performDailyCheckin(supabase, userId);
  });
