import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AuthSupabase = SupabaseClient<Database>;

export async function awardUserXp(
  supabase: AuthSupabase,
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {},
) {
  if (!userId || !Number.isFinite(amount) || amount <= 0) return;

  const { error } = await supabase.from("xp_events").insert({
    user_id: userId,
    amount,
    reason,
    metadata: metadata as never,
  });

  if (error) throw error;
}
