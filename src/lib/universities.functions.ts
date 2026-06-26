import { createServerFn } from "@tanstack/react-start";
import { awardXp } from "./xp-award.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS } from "./xp";

export const UNI_STATUSES = ["researching", "shortlisted", "applied", "admitted", "rejected"] as const;

export const getUniversities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("universities")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    return data ?? [];
  });

const Schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  country: z.string().max(80).optional(),
  program: z.string().max(200).optional(),
  status: z.enum(UNI_STATUSES),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  tuition_usd: z.number().nonnegative().max(1_000_000).optional().nullable(),
  ranking: z.number().int().min(1).max(5000).optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export const upsertUniversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      name: data.name,
      country: data.country ?? null,
      program: data.program ?? null,
      status: data.status,
      deadline: data.deadline || null,
      tuition_usd: data.tuition_usd ?? null,
      ranking: data.ranking ?? null,
      notes: data.notes ?? null,
    };

    let xp = 0;
    let prev: string | null = null;
    if (data.id) {
      const { data: row } = await supabase
        .from("universities")
        .select("status")
        .eq("id", data.id)
        .eq("user_id", userId)
        .maybeSingle();
      prev = row?.status ?? null;
      await supabase.from("universities").update(payload).eq("id", data.id).eq("user_id", userId);
    } else {
      await supabase.from("universities").insert(payload);
    }

    if (data.status === "applied" && prev !== "applied") {
      xp = XP_REWARDS.university_submitted;
      await awardXp(userId, xp, "university_submitted", { name: data.name });
    }
    return { xp };
  });

const DeleteSchema = z.object({ id: z.string().uuid() });
export const deleteUniversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("universities").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
