import { createAdminClient } from "@/lib/supabase/admin";

// The 300 MZN one-time "unlock production mode" charge isn't tied to a
// products/orders row (it's a platform fee, not a sale) — this is the
// webhook-side counterpart to lib/order-fulfillment.ts's creditOrder,
// shared by both payment provider webhooks.
export async function completeProductionUnlock(
  unlockId: string,
  authoritative: { amount?: number; currency?: string }
): Promise<{ handled: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: unlock } = await supabase.from("production_unlocks").select("*").eq("id", unlockId).single();
  if (!unlock) return { handled: false };
  if (unlock.status === "paid") return { handled: true };

  if (authoritative.amount != null && Math.abs(authoritative.amount - unlock.amount) > 0.01) {
    return { handled: true, error: "amount_mismatch" };
  }
  if (authoritative.currency && authoritative.currency !== unlock.currency) {
    return { handled: true, error: "currency_mismatch" };
  }

  await supabase
    .from("production_unlocks")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", unlock.id);
  await supabase
    .from("profiles")
    .update({ production_unlocked_at: new Date().toISOString() })
    .eq("id", unlock.producer_id);

  return { handled: true };
}
