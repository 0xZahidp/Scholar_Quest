import { createServerFn } from "@tanstack/react-start";
import { awardXp } from "./xp-award.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { XP_REWARDS } from "./xp";

export const DOCUMENT_KINDS = [
  { key: "cv", label: "CV / Résumé", xp: XP_REWARDS.cv_uploaded },
  { key: "sop", label: "Statement of Purpose", xp: XP_REWARDS.sop_drafted },
  { key: "passport", label: "Passport", xp: XP_REWARDS.passport_created },
  { key: "transcript", label: "Academic Transcript", xp: XP_REWARDS.document_uploaded },
  { key: "lor", label: "Letter of Recommendation", xp: XP_REWARDS.document_uploaded },
  { key: "ielts_cert", label: "IELTS Certificate", xp: XP_REWARDS.document_uploaded },
  { key: "diploma", label: "Diploma / Degree", xp: XP_REWARDS.document_uploaded },
  { key: "research", label: "Research Proposal", xp: XP_REWARDS.document_uploaded },
] as const;

export const DOC_STATUSES = ["not_started", "drafting", "in_review", "finalized"] as const;

export const getDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    return data ?? [];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.string().min(1).max(40),
  title: z.string().min(1).max(160),
  status: z.enum(DOC_STATUSES),
  file_url: z.string().url().max(500).optional().or(z.literal("")),
  file_path: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
});

export const upsertDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      kind: data.kind,
      title: data.title,
      status: data.status,
      file_url: data.file_url || null,
      file_path: data.file_path || null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    let xp = 0;
    let isNew = false;
    let prevStatus: string | null = null;

    if (data.id) {
      const { data: prev } = await supabase
        .from("documents")
        .select("status")
        .eq("id", data.id)
        .eq("user_id", userId)
        .maybeSingle();
      prevStatus = prev?.status ?? null;
      await supabase.from("documents").update(payload).eq("id", data.id).eq("user_id", userId);
    } else {
      isNew = true;
      await supabase.from("documents").insert(payload);
    }

    // Award XP on first finalization
    if (data.status === "finalized" && prevStatus !== "finalized") {
      const meta = DOCUMENT_KINDS.find((k) => k.key === data.kind);
      xp = meta?.xp ?? XP_REWARDS.document_uploaded;
      await awardXp(userId, xp, data.kind === "cv" ? "cv_uploaded" : data.kind === "sop" ? "sop_drafted" : "document_uploaded", { kind: data.kind, title: data.title });
    }

    return { xp, isNew };
  });

const DeleteSchema = z.object({ id: z.string().uuid() });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (row?.file_path) {
      await supabase.storage.from("documents").remove([row.file_path]);
    }
    await supabase.from("documents").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
