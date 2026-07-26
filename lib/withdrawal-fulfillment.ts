import { createAdminClient } from "@/lib/supabase/admin";
import { createPayout } from "@/lib/zumbopay";

// Shared B2C payout logic — used by both the admin "Pagar via ZumboPay"
// action and the producer self-service instant-payout action (available
// to producers who unlocked the developer API's production mode).
export async function payWithdrawalB2C(
  withdrawalId: string
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  const supabase = createAdminClient();
  const { data: withdrawal } = await supabase.from("withdrawals").select("*").eq("id", withdrawalId).single();
  if (!withdrawal) return { ok: false, error: "Levantamento não encontrado." };
  if (withdrawal.status === "paid" || withdrawal.status === "confirmed") {
    return { ok: false, error: "Este levantamento já foi pago." };
  }
  if (withdrawal.status === "rejected") return { ok: false, error: "Este levantamento foi rejeitado." };
  // ZumboPay só suporta B2C instantâneo (auto_dispatch) para M-Pesa — outros
  // métodos ficam pendentes à espera de aprovação manual do lado deles.
  if (withdrawal.payout_method !== "mpesa") {
    return { ok: false, error: "Pagamento instantâneo via B2C só suporta M-Pesa por agora." };
  }

  const result = await createPayout({
    method: "mpesa",
    amount: withdrawal.net_amount,
    destination: withdrawal.destination,
    notes: `Levantamento PagaJá ${withdrawal.id}`,
    autoDispatch: true,
  });

  if (!result.success || result.status !== "success") {
    return { ok: false, error: result.error ?? "Pagamento não confirmado pela ZumboPay." };
  }

  await supabase
    .from("withdrawals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payout_reference: result.providerReference ?? result.reference ?? null,
    })
    .eq("id", withdrawalId);

  return { ok: true, reference: result.providerReference ?? result.reference };
}
