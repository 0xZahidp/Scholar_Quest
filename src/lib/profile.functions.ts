import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { awardUserXp } from "./xp-award";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    let data = profile;
    if (error) throw error;
    if (!data) {
      const insert = await supabase.from("profiles").insert({ id: userId }).select("*").single();
      if (insert.error) throw insert.error;
      data = insert.data;
    }
    return data;
  });

const OnboardingSchema = z.object({
  display_name: z.string().min(1).max(80),
  country: z.string().min(1).max(80),
  target_degree: z.enum(["Bachelor's", "Master's", "PhD"]),
  target_countries: z.array(z.string().min(1).max(80)).min(1).max(8),
  target_fields: z.array(z.string().min(1).max(80)).min(1).max(8),
  target_departure_date: z.string().nullable().optional(),
  has_passport: z.boolean(),
  budget_goal: z.number().min(0).max(1_000_000),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, ...data, onboarded: true, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw error;

    // Default IELTS targets row
    const { error: targetError } = await supabase
      .from("ielts_targets")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
    if (targetError) throw targetError;

    // Welcome XP
    await awardUserXp(supabase, userId, 200, "onboarding_complete");
    return { ok: true };
  });

const ProfilePatchSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  target_departure_date: z.string().nullable().optional(),
  budget_goal: z.number().min(0).max(1_000_000).optional(),
  budget_saved: z.number().min(0).max(1_000_000).optional(),
  has_passport: z.boolean().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfilePatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });
