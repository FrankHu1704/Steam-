"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { payWithdrawalB2C } from "@/lib/withdrawal-fulfillment";
import { sendWithdrawalRequestedEmail, sendAdminWithdrawalRequestedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import type { PayoutMethod } from "@/types/database";

async function notifyAdminsOfWithdrawal(
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    producerName: string;
    amount: number;
    netAmount: number;
    currency: string;
    payoutMethod: string;
    destination: string;
    instant: boolean;
  }
) {
  const { data: admins } = await supabase.from("profiles").select("id, email").eq("role", "admin");
  for (const admin of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: admin.id,
      type: "withdrawal",
      title: input.instant ? "Levantamento pago via B2C" : "Levantamento pendente de aprovação",
      message: `${input.producerName} pediu um levantamento de ${input.netAmount} ${input.currency}${input.instant ? " — pago automaticamente." : " — precisa da sua aprovação."}`,
    });
    await sendPushToUser(admin.id, {
      title: input.instant ? "Levantamento pago via B2C" : "Levantamento pendente ⏳",
      body: `${input.producerName} — ${input.netAmount} ${input.currency}`,
      url: "/admin/withdrawals",
    });
    if (admin.email) {
      await sendAdminWithdrawalRequestedEmail({
        adminEmail: admin.email,
        producerName: input.producerName,
        amount: input.amount,
        netAmount: input.netAmount,
        currency: input.currency,
        payoutMethod: input.payoutMethod,
        destination: input.destination,
        instant: input.instant,
      });
    }
  }
}

export async function requestWithdrawal(input: { amount: number; payoutMethod: PayoutMethod; destination: string }) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };

  if (input.amount <= 0) return { error: "Indique um valor válido." };
  if (!input.destination.trim()) return { error: "Indique o destino do levantamento." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, balance_available, currency")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };

  const { data: minSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "withdrawal_minimum_amount")
    .single();
  const minimumAmount = Number(minSetting?.value ?? 150);
  if (input.amount < minimumAmount) {
    return { error: `O valor mínimo para levantamento é ${minimumAmount} MT.` };
  }
  if (input.amount > profile.balance_available) return { error: "Saldo insuficiente." };

  const { data: feeSetting } = await supabase.from("settings").select("value").eq("key", "withdrawal_fee_percent").single();
  const feePercent = typeof feeSetting?.value === "number" ? feeSetting.value : Number(feeSetting?.value ?? 5);

  const feeAmount = Math.round(input.amount * (feePercent / 100) * 100) / 100;
  const netAmount = input.amount - feeAmount;

  const { data: withdrawal, error } = await supabase
    .from("withdrawals")
    .insert({
      producer_id: user.id,
      amount: input.amount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      currency: profile.currency,
      payout_method: input.payoutMethod,
      destination: input.destination,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !withdrawal) return { error: error?.message ?? "Falha ao pedir o levantamento." };

  await supabase
    .from("profiles")
    .update({
      balance_available: profile.balance_available - input.amount,
    })
    .eq("id", user.id);

  // Every withdrawal now tries instant B2C automatically for every
  // producer — no paywall gate. If the active processor/method combo
  // can't auto-dispatch (or the attempt fails for any reason), it just
  // stays "pending" for admin to pay manually, exactly as before.
  const instant = await payWithdrawalB2C(withdrawal.id);

  await sendWithdrawalRequestedEmail({
    producerEmail: profile.email,
    producerName: profile.name,
    amount: input.amount,
    netAmount,
    currency: profile.currency,
    payoutMethod: input.payoutMethod,
    destination: input.destination,
    instant: instant.ok,
  });

  await notifyAdminsOfWithdrawal(supabase, {
    producerName: profile.name,
    amount: input.amount,
    netAmount,
    currency: profile.currency,
    payoutMethod: input.payoutMethod,
    destination: input.destination,
    instant: instant.ok,
  });

  return { withdrawalId: withdrawal.id as string, instant: instant.ok };
}

// Manual retry of instant B2C — available to any producer, e.g. if the
// automatic attempt above failed (transient provider error) and they want
// to try again instead of waiting for admin.
export async function requestSelfServiceB2CPayout(withdrawalId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };

  const supabase = createAdminClient();
  const { data: withdrawal } = await supabase
    .from("withdrawals")
    .select("producer_id, amount, net_amount, currency, payout_method, destination")
    .eq("id", withdrawalId)
    .single();
  if (!withdrawal || withdrawal.producer_id !== user.id) return { error: "Levantamento não encontrado." };

  const result = await payWithdrawalB2C(withdrawalId);
  if (!result.ok) return { error: result.error };

  const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).single();
  if (profile) {
    await sendWithdrawalRequestedEmail({
      producerEmail: profile.email,
      producerName: profile.name,
      amount: withdrawal.amount,
      netAmount: withdrawal.net_amount,
      currency: withdrawal.currency,
      payoutMethod: withdrawal.payout_method,
      destination: withdrawal.destination,
      instant: true,
    });
    await notifyAdminsOfWithdrawal(supabase, {
      producerName: profile.name,
      amount: withdrawal.amount,
      netAmount: withdrawal.net_amount,
      currency: withdrawal.currency,
      payoutMethod: withdrawal.payout_method,
      destination: withdrawal.destination,
      instant: true,
    });
  }

  return { ok: true, reference: result.reference };
}

export async function confirmWithdrawalReceipt(withdrawalId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };

  const supabase = createAdminClient();
  const { data: withdrawal } = await supabase.from("withdrawals").select("*").eq("id", withdrawalId).single();
  if (!withdrawal || withdrawal.producer_id !== user.id) return { error: "Levantamento não encontrado." };
  if (withdrawal.status !== "paid") return { error: "Este levantamento ainda não foi pago." };

  await supabase
    .from("withdrawals")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", withdrawalId);

  return { ok: true };
}
