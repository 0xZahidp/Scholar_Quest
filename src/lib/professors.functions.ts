import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS } from "./xp";
import { awardUserXp } from "./xp-award";

export const PROF_STATUSES = [
  "researching",
  "drafted",
  "emailed",
  "replied",
  "meeting",
  "accepted",
] as const;

export const getProfessors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("professors")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const Schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  university: z.string().max(160).optional().nullable(),
  field: z.string().max(160).optional().nullable(),
  email: z.string().email().max(160).optional().or(z.literal("")).nullable(),
  status: z.enum(PROF_STATUSES),
  last_contact_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      name: data.name,
      university: data.university ?? null,
      field: data.field ?? null,
      email: data.email || null,
      status: data.status,
      last_contact_on: data.last_contact_on || null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    let prev: string | null = null;
    if (data.id) {
      const { data: row } = await supabase
        .from("professors")
        .select("status")
        .eq("id", data.id)
        .eq("user_id", userId)
        .maybeSingle();
      prev = row?.status ?? null;
      const { error } = await supabase
        .from("professors")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("professors").insert(payload);
      if (error) throw error;
    }
    let xp = 0;
    if (
      data.status === "emailed" &&
      prev !== "emailed" &&
      prev !== "replied" &&
      prev !== "meeting" &&
      prev !== "accepted"
    ) {
      xp = XP_REWARDS.professor_emailed;
      await awardUserXp(supabase, userId, xp, "professor_emailed", { name: data.name });
    }
    return { xp };
  });

export const deleteProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("professors")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
