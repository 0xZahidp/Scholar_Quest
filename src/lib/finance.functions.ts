import { createServerFn } from "@tanstack/react-start";
import { awardXp } from "./xp-award.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS } from "./xp";

export const FINANCE_KINDS = ["income", "expense", "savings"] as const;

export const getFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: entries }, { data: profile }] = await Promise.all([
      supabase
        .from("finance_entries")
        .select("*")
        .eq("user_id", userId)
        .order("occurred_on", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select("budget_goal,budget_saved")
        .eq("id", userId)
        .maybeSingle(),
    ]);
    return {
      entries: entries ?? [],
      goal: Number(profile?.budget_goal ?? 0),
      saved: Number(profile?.budget_saved ?? 0),
    };
  });

const EntrySchema = z.object({
  kind: z.enum(FINANCE_KINDS),
  amount: z.number().positive().max(10_000_000),
  label: z.string().min(1).max(120),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function recomputeSaved(entries: { kind: string; amount: number }[]): number {
  return entries.reduce((sum, e) => {
    const n = Number(e.amount);
    if (e.kind === "savings" || e.kind === "income") return sum + n;
    if (e.kind === "expense") return sum - n;
    return sum;
  }, 0);
}

export const addFinanceEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EntrySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("finance_entries").insert({ ...data, user_id: userId });

    const { data: all } = await supabase
      .from("finance_entries")
      .select("kind,amount")
      .eq("user_id", userId);
    const saved = Math.max(0, recomputeSaved(all ?? []));

    const { data: profile } = await supabase
      .from("profiles")
      .select("budget_goal,budget_saved")
      .eq("id", userId)
      .maybeSingle();

    const prevSaved = Number(profile?.budget_saved ?? 0);
    const goal = Number(profile?.budget_goal ?? 0);

    await supabase
      .from("profiles")
      .update({ budget_saved: saved, updated_at: new Date().toISOString() })
      .eq("id", userId);

    let xp = 0;
    if (goal > 0) {
      const milestones = [0.25, 0.5, 0.75, 1.0];
      const crossed = milestones.find(
        (m) => prevSaved < goal * m && saved >= goal * m,
      );
      if (crossed) {
        xp = XP_REWARDS.budget_milestone;
        await awardXp(userId, xp, "budget_milestone", { milestone: crossed, saved, goal });
      }
    }
    return { xp, saved };
  });

const DeleteSchema = z.object({ id: z.string().uuid() });
export const deleteFinanceEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("finance_entries").delete().eq("id", data.id).eq("user_id", userId);
    const { data: all } = await supabase
      .from("finance_entries")
      .select("kind,amount")
      .eq("user_id", userId);
    const saved = Math.max(0, recomputeSaved(all ?? []));
    await supabase.from("profiles").update({ budget_saved: saved }).eq("id", userId);
    return { ok: true, saved };
  });

const GoalSchema = z.object({ goal: z.number().nonnegative().max(10_000_000) });

export const setBudgetGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GoalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({ budget_goal: data.goal, updated_at: new Date().toISOString() })
      .eq("id", userId);
    return { ok: true };
  });
