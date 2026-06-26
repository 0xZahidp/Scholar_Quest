import { createServerFn } from "@tanstack/react-start";
import { awardXp } from "./xp-award.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS } from "./xp";
import { SCHOLARSHIPS } from "./scholarships";

export const getDreams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: dreams }, { data: deadlines }] = await Promise.all([
      supabase.from("dream_scholarships").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("deadlines").select("*").eq("user_id", userId).order("due_date"),
    ]);
    return { dreams: dreams ?? [], deadlines: deadlines ?? [] };
  });

const AddSchema = z.object({ scholarship_key: z.string().min(1).max(64) });

export const addDream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sch = SCHOLARSHIPS.find((s) => s.key === data.scholarship_key);
    if (!sch) throw new Error("Unknown scholarship");

    const { data: existing } = await supabase
      .from("dream_scholarships")
      .select("id")
      .eq("user_id", userId)
      .eq("scholarship_key", data.scholarship_key)
      .maybeSingle();
    if (existing) return { added: false, xp: 0 };

    await supabase.from("dream_scholarships").insert({
      user_id: userId,
      scholarship_key: data.scholarship_key,
      status: "researching",
    });
    await supabase.from("deadlines").insert({
      user_id: userId,
      title: `${sch.name} application due`,
      due_date: sch.deadline,
      category: "scholarship",
    });
    await awardXp(userId, XP_REWARDS.scholarship_researched, "scholarship_researched", { key: data.scholarship_key });
    return { added: true, xp: XP_REWARDS.scholarship_researched };
  });

const RemoveSchema = z.object({ id: z.string().uuid() });

export const removeDream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("dream_scholarships").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["researching", "preparing", "applied", "interview", "won", "rejected"]),
});

export const setDreamStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("dream_scholarships")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", userId);

    let xp = 0;
    if (data.status === "applied") xp = XP_REWARDS.scholarship_applied;
    if (data.status === "won") xp = XP_REWARDS.scholarship_won;
    if (xp > 0) {
      await awardXp(userId, xp, data.status === "won" ? "scholarship_won" : "scholarship_applied", { dream_id: data.id });
    }
    return { ok: true, xp };
  });

const DeadlineSchema = z.object({
  title: z.string().min(1).max(200),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).max(40).default("custom"),
});

export const addDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeadlineSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("deadlines")
      .insert({ ...data, user_id: userId })
      .select("*")
      .single();
    return row;
  });

const DelDeadlineSchema = z.object({ id: z.string().uuid() });

export const removeDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DelDeadlineSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("deadlines").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
