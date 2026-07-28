import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePaymentProvider, providerModule, b2cMethodsForProvider } from "@/lib/payments";

// Shared B2C payout logic — used by both the admin "Pagar via B2C" action
// and the producer self-service instant-payout action (available to
// producers who unlocked the developer API's production mode). Uses
// whichever payment provider is currently active, since that's whichever
// one actually holds PagaJá's merchant wallet balance.
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

  const providerName = await getActivePaymentProvider();
  const allowedMethods = b2cMethodsForProvider(providerName);
  if (!(allowedMethods as readonly string[]).includes(withdrawal.payout_method)) {
    return {
      ok: false,
      error: `Pagamento instantâneo via B2C não suporta ${withdrawal.payout_method} no processador ativo.`,
    };
  }

  const result = await providerModule(providerName).createPayout({
    method: withdrawal.payout_method as "mpesa" | "emola",
    amount: withdrawal.net_amount,
    destination: withdrawal.destination,
    notes: `Levantamento PagaJá ${withdrawal.id}`,
    autoDispatch: true,
  });

  if (!result.success || result.status !== "success") {
    return { ok: false, error: result.error ?? "Pagamento não confirmado pelo processador." };
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
