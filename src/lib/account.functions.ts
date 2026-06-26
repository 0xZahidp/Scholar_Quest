import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function removeDocumentFiles(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: files } = await supabaseAdmin.storage
    .from("documents")
    .list(userId, { limit: 1000 });

  if (files && files.length > 0) {
    await supabaseAdmin.storage.from("documents").remove(files.map((f) => `${userId}/${f.name}`));
  }
}

export const resetProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    try {
      await removeDocumentFiles(userId);
    } catch {
      // SQL cannot directly delete storage objects; keep database reset available.
    }

    const { error } = await supabase.rpc("reset_user_progress");
    if (error) throw new Error(error.message || "Could not reset progress");

    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Best-effort: remove this user's storage objects before deleting auth row.
    try {
      await removeDocumentFiles(userId);
    } catch {
      // ignore storage cleanup failures — auth deletion still proceeds
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message || "Could not delete account");
    return { ok: true };
  });
