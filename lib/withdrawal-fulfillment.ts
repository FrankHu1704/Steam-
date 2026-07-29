import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePaymentProvider, providerModule, b2cMethodsForProvider } from "@/lib/payments";

// Shared B2C payout logic — used by both the admin "Pagar via B2C" action
// and the producer self-service instant-payout action. If the active
// provider can't dispatch (unsupported method, insufficient balance, etc.),
// this returns ok:false without touching the withdrawal's status, so it
// stays "pending" for the admin to pay manually. Uses whichever payment
// provider is currently active, since that's whichever one actually holds
// PagaJá's merchant wallet balance.
export async function payWithdrawalB2C(
  withdrawalId: string
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  const supabase = createAdminClient();
  const { data: withdrawal } = await supabase
    .from("withdrawals")
    .select("*, profiles!producer_id(name)")
    .eq("id", withdrawalId)
    .single();
  if (!withdrawal) return { ok: false, error: "Levantamento não encontrado." };
  const producerName = (withdrawal as unknown as { profiles: { name: string } | null }).profiles?.name ?? "—";

  async function logAttempt(input: { success: boolean; error?: string; reference?: string; provider: string }) {
    await supabase.from("logs").insert({
      action: "b2c_payout_attempt",
      target_table: "withdrawals",
      target_id: withdrawalId,
      metadata: {
        producer_name: producerName,
        amount: withdrawal.amount,
        net_amount: withdrawal.net_amount,
        currency: withdrawal.currency,
        payout_method: withdrawal.payout_method,
        provider: input.provider,
        success: input.success,
        error: input.error ?? null,
        reference: input.reference ?? null,
      },
    });
  }

  if (withdrawal.status === "paid" || withdrawal.status === "confirmed") {
    return { ok: false, error: "Este levantamento já foi pago." };
  }
  if (withdrawal.status === "rejected") return { ok: false, error: "Este levantamento foi rejeitado." };

  const providerName = await getActivePaymentProvider();
  const allowedMethods = b2cMethodsForProvider(providerName);
  if (!(allowedMethods as readonly string[]).includes(withdrawal.payout_method)) {
    const error = `Pagamento instantâneo via B2C não suporta ${withdrawal.payout_method} no processador ativo.`;
    await logAttempt({ success: false, error, provider: providerName });
    return { ok: false, error };
  }

  const result = await providerModule(providerName).createPayout({
    method: withdrawal.payout_method as "mpesa" | "emola",
    amount: withdrawal.net_amount,
    destination: withdrawal.destination,
    notes: `Levantamento PagaJá ${withdrawal.id}`,
    autoDispatch: true,
  });

  if (!result.success || result.status !== "success") {
    const error = result.error ?? "Pagamento não confirmado pelo processador.";
    await logAttempt({ success: false, error, provider: providerName });
    return { ok: false, error };
  }

  const reference = result.providerReference ?? result.reference;

  await supabase
    .from("withdrawals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payout_reference: reference ?? null,
    })
    .eq("id", withdrawalId);

  await logAttempt({ success: true, reference, provider: providerName });

  return { ok: true, reference };
}
