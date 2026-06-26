import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Best-effort: remove this user's storage objects before deleting auth row.
    try {
      const { data: files } = await supabase.storage
        .from("documents")
        .list(userId, { limit: 1000 });
      if (files && files.length > 0) {
        await supabase.storage
          .from("documents")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // ignore storage cleanup failures — auth deletion still proceeds
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete account");
    return { ok: true };
  });
