import { createServerFn } from "@tanstack/react-start";
import { awardXp } from "./xp-award.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { analyzeIelts, computeOverall, DEFAULT_TARGETS, type Mock, type Targets } from "./ielts-engine";
import { XP_REWARDS } from "./xp";

export const getIelts = createServerFn({ method: "GET" })
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

    const targets: Targets = target
      ? {
          target_listening: Number(target.target_listening ?? 7),
          target_reading: Number(target.target_reading ?? 7),
          target_writing: Number(target.target_writing ?? 7),
          target_speaking: Number(target.target_speaking ?? 7),
          target_overall: Number(
            ((Number(target.target_listening ?? 7) +
              Number(target.target_reading ?? 7) +
              Number(target.target_writing ?? 7) +
              Number(target.target_speaking ?? 7)) /
              4).toFixed(1),
          ),
          exam_date: target.exam_date ?? null,
        }
      : DEFAULT_TARGETS;

    const normalized: Mock[] = (mocks ?? []).map((m) => ({
      id: m.id,
      taken_on: m.taken_on,
      listening: m.listening != null ? Number(m.listening) : null,
      reading: m.reading != null ? Number(m.reading) : null,
      writing: m.writing != null ? Number(m.writing) : null,
      speaking: m.speaking != null ? Number(m.speaking) : null,
      overall: m.overall != null ? Number(m.overall) : null,
    }));

    return {
      mocks: normalized,
      targets,
      analysis: analyzeIelts(normalized, targets),
    };
  });

const MockSchema = z.object({
  taken_on: z.string().min(8).max(10),
  listening: z.number().min(0).max(9),
  reading: z.number().min(0).max(9),
  writing: z.number().min(0).max(9),
  speaking: z.number().min(0).max(9),
  notes: z.string().max(500).optional().nullable(),
});

export const logMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MockSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const overall = computeOverall(data)!;
    const { error } = await supabase.from("ielts_mocks").insert({
      user_id: userId,
      taken_on: data.taken_on,
      listening: data.listening,
      reading: data.reading,
      writing: data.writing,
      speaking: data.speaking,
      overall,
      notes: data.notes ?? null,
    });
    if (error) throw error;

    let bonus = XP_REWARDS.ielts_mock;
    if (overall >= 7) bonus += XP_REWARDS.band_7;
    await awardXp(userId, bonus, overall >= 7 ? "band_7" : "ielts_mock", { overall, taken_on: data.taken_on });

    return { ok: true, overall, xp: bonus };
  });

const TargetSchema = z.object({
  target_listening: z.number().min(4).max(9),
  target_reading: z.number().min(4).max(9),
  target_writing: z.number().min(4).max(9),
  target_speaking: z.number().min(4).max(9),
  exam_date: z.string().nullable().optional(),
});

export const setIeltsTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TargetSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("ielts_targets").upsert(
      {
        user_id: userId,
        target_listening: data.target_listening,
        target_reading: data.target_reading,
        target_writing: data.target_writing,
        target_speaking: data.target_speaking,
        target_overall:
          (data.target_listening + data.target_reading + data.target_writing + data.target_speaking) / 4,
        exam_date: data.exam_date ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true };
  });
