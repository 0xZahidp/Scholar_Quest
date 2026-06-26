// Server-only helper. The .server.ts extension prevents this from being
// bundled into the client. All XP writes must go through awardXp() so the
// public xp_events table can keep INSERT locked down (no client policy).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function awardXp(
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {},
) {
  if (!userId || !Number.isFinite(amount)) return;
  const { error } = await supabaseAdmin.from("xp_events").insert({
    user_id: userId,
    amount,
    reason,
    metadata: metadata as never,
  });
  if (error) throw error;
}
