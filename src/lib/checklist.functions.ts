import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CHECKLIST_KINDS = ["visa", "departure"] as const;
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number];

export const VISA_TEMPLATE = [
  "Confirm visa category (student / research)",
  "Gather passport (valid 6+ months)",
  "Get university admission letter (I-20 / CAS)",
  "Bank statement / financial proof",
  "Medical exam / vaccinations",
  "Visa application form + fee",
  "Book embassy interview slot",
  "SEVIS / biometric appointment",
  "Travel insurance",
];

export const DEPARTURE_TEMPLATE = [
  "Book flight (1-stop optimal route)",
  "Confirm housing / dorm assignment",
  "Currency exchange / international card",
  "International SIM or eSIM",
  "Pack academic transcripts (originals + copies)",
  "Buy power adapter & voltage converters",
  "Pre-departure orientation (recorded session)",
  "Notify bank of travel",
  "Pack clothing for destination climate",
  "Print accommodation + arrival address",
];

const KindSchema = z.object({ kind: z.enum(CHECKLIST_KINDS) });

export const getChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KindSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let { data: rows } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", data.kind)
      .order("created_at", { ascending: true });
    if (!rows || rows.length === 0) {
      const template = data.kind === "visa" ? VISA_TEMPLATE : DEPARTURE_TEMPLATE;
      const insert = await supabase
        .from("checklist_items")
        .insert(template.map((title) => ({ user_id: userId, kind: data.kind, title })))
        .select("*");
      if (insert.error) throw insert.error;
      rows = insert.data ?? [];
    }
    return rows;
  });

const ToggleSchema = z.object({ id: z.string().uuid(), status: z.enum(["todo", "done"]) });
export const toggleChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("checklist_items")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

const AddSchema = z.object({
  kind: z.enum(CHECKLIST_KINDS),
  title: z.string().min(1).max(200),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});
export const addChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("checklist_items").insert({
      user_id: userId,
      kind: data.kind,
      title: data.title,
      due_date: data.due_date || null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
