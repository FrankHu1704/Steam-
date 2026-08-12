import { createAdminClient } from "@/lib/supabase/admin";
import { resolveB2CProvider, chargeProviderModule, b2cMethodsForProvider } from "@/lib/payments";
import { sendWithdrawalRequestedEmail } from "@/lib/email";

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
    .select("*, profiles!producer_id(name, email)")
    .eq("id", withdrawalId)
    .single();
  if (!withdrawal) return { ok: false, error: "Levantamento não encontrado." };
  const producerProfile = (withdrawal as unknown as { profiles: { name: string; email: string } | null }).profiles;
  const producerName = producerProfile?.name ?? "—";

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

  const providerName = await resolveB2CProvider(withdrawal.payout_method as "mpesa" | "emola", withdrawal.currency);
  if (providerName !== "pagar" && providerName !== "paysuite") {
    const allowedMethods = b2cMethodsForProvider(providerName);
    if (!(allowedMethods as readonly string[]).includes(withdrawal.payout_method)) {
      const error = `Pagamento instantâneo via B2C não suporta ${withdrawal.payout_method} no processador ativo.`;
      await logAttempt({ success: false, error, provider: providerName });
      return { ok: false, error };
    }
  }

  const result = await chargeProviderModule(providerName).createPayout({
    method: withdrawal.payout_method as "mpesa" | "emola",
    amount: withdrawal.net_amount,
    destination: withdrawal.destination,
    notes: `Levantamento PagaJá ${withdrawal.id}`,
    recipientName: producerName,
    autoDispatch: true,
  });

  if (!result.success || result.status !== "success") {
    const error = result.error ?? "Pagamento não confirmado pelo processador.";
    await logAttempt({ success: false, error, provider: providerName });
    return { ok: false, error };
  }

  const reference = result.providerReference ?? result.reference;
  // Only populated when the provider tells us it took an extra cut beyond
  // what the recipient received (currently just Pagar's B2C fee) — PagaJá
  // absorbed it already by grossing up the request, so this is purely for
  // the profit calculation to count it as a real cost instead of it
  // silently vanishing.
  const providerFeeAmount =
    providerName === "pagar" && typeof result.feeAmount === "number" ? result.feeAmount : 0;

  await supabase
    .from("withdrawals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payout_reference: reference ?? null,
      provider_fee_amount: providerFeeAmount,
    })
    .eq("id", withdrawalId);

  await logAttempt({ success: true, reference, provider: providerName });

  if (producerProfile?.email) {
    await sendWithdrawalRequestedEmail({
      producerEmail: producerProfile.email,
      producerName,
      amount: withdrawal.amount,
      netAmount: withdrawal.net_amount,
      currency: withdrawal.currency,
      payoutMethod: withdrawal.payout_method,
      destination: withdrawal.destination,
      instant: true,
    });
  }

  return { ok: true, reference };
}
