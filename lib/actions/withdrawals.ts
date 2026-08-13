"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { payWithdrawalB2C } from "@/lib/withdrawal-fulfillment";
import { sendWithdrawalRequestedEmail, sendAdminWithdrawalRequestedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { sendWithdrawalOtp, verifyAndConsumeWithdrawalOtp } from "@/lib/withdrawal-otp";
import { getWithdrawalsEnabled } from "@/lib/data/withdrawals";
import type { PayoutMethod } from "@/types/database";

const WITHDRAWALS_MAINTENANCE_MESSAGE =
  "Os levantamentos estão temporariamente em manutenção. Contacte o suporte: +258 84 931 1757.";

export async function sendWithdrawalOtpCode() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { ok: false as const, error: "Precisa de iniciar sessão." };
  if (!(await getWithdrawalsEnabled())) return { ok: false as const, error: WITHDRAWALS_MAINTENANCE_MESSAGE };

  const supabase = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("email, name").eq("id", user.id).single();

  return sendWithdrawalOtp(user.id, profile?.email ?? null, profile?.name);
}

// Automatic fraud SIGNAL, not an automatic block — several different
// producer accounts cashing out to the exact same phone number is a
// known multi-account/money-mule pattern, but it can also be innocent
// (family sharing one mobile money number), so this only flags both
// accounts for an admin to review via markUserAsFraud() in
// lib/actions/admin.ts, it never locks anyone out or touches balances by
// itself. Only checks against destinations from a withdrawal that
// actually got paid — a pending/failed one proves nothing yet.
async function flagIfSharedPayoutDestination(
  supabase: ReturnType<typeof createAdminClient>,
  input: { withdrawalId: string; producerId: string; producerName: string; destination: string }
) {
  const { data: priorPaid } = await supabase
    .from("withdrawals")
    .select("producer_id, profiles!producer_id(name)")
    .eq("destination", input.destination)
    .neq("producer_id", input.producerId)
    .in("status", ["paid", "confirmed"])
    .limit(1)
    .maybeSingle<{ producer_id: string; profiles: { name: string } | null }>();

  if (!priorPaid) return;

  await supabase.from("logs").insert({
    action: "fraud_alert_shared_destination",
    target_table: "withdrawals",
    target_id: input.withdrawalId,
    metadata: {
      destination: input.destination,
      producer_id: input.producerId,
      producer_name: input.producerName,
      other_producer_id: priorPaid.producer_id,
      other_producer_name: priorPaid.profiles?.name ?? null,
    },
  });

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  for (const admin of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: admin.id,
      type: "fraud_alert",
      title: "Possível fraude: destino de saque partilhado",
      message: `${input.producerName} pediu um saque para o mesmo número já usado por ${priorPaid.profiles?.name ?? "outra conta"} — reveja as duas contas.`,
    });
    await sendPushToUser(admin.id, {
      title: "⚠️ Possível fraude — destino partilhado",
      body: `${input.producerName} ↔ ${priorPaid.profiles?.name ?? "outra conta"}`,
      url: `/admin/users/${input.producerId}`,
    });
  }
}

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

export async function requestWithdrawal(input: {
  amount: number;
  payoutMethod: PayoutMethod;
  destination: string;
  walletSource?: "producer" | "dev" | "cto" | "sponsor";
  otpCode: string;
}) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };
  if (!(await getWithdrawalsEnabled())) return { error: WITHDRAWALS_MAINTENANCE_MESSAGE };

  const otpResult = await verifyAndConsumeWithdrawalOtp(user.id, input.otpCode);
  if (!otpResult.ok) return { error: otpResult.error };

  if (input.amount <= 0) return { error: "Indique um valor válido." };
  if (!input.destination.trim()) return { error: "Indique o destino do levantamento." };

  const walletSource = input.walletSource ?? "producer";
  const walletField =
    walletSource === "dev"
      ? "balance_available_dev"
      : walletSource === "cto"
        ? "balance_available_cto"
        : walletSource === "sponsor"
          ? "balance_available_sponsor"
          : "balance_available";

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, balance_available, balance_available_dev, balance_available_cto, balance_available_sponsor, currency")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };
  const currentBalance = profile[walletField];

  const { data: minSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "withdrawal_minimum_amount")
    .single();
  const minimumAmount = Number(minSetting?.value ?? 200);
  if (input.amount < minimumAmount) {
    return { error: `O valor mínimo para levantamento é ${minimumAmount} MT.` };
  }
  if (input.amount > currentBalance) return { error: "Saldo insuficiente." };

  // The CTO's and sponsor's balances are already the platform's own
  // profit share handed to them — charging the standard withdrawal fee on
  // top would just be the platform taking a cut of a cut, so those
  // wallets always withdraw in full.
  let feeAmount = 0;
  if (walletSource !== "cto" && walletSource !== "sponsor") {
    const { data: feeSetting } = await supabase.from("settings").select("value").eq("key", "withdrawal_fee_percent").single();
    const feePercent = typeof feeSetting?.value === "number" ? feeSetting.value : Number(feeSetting?.value ?? 20);
    feeAmount = Math.round(input.amount * (feePercent / 100) * 100) / 100;
  }
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
      wallet_source: walletSource,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !withdrawal) return { error: error?.message ?? "Falha ao pedir o levantamento." };

  await flagIfSharedPayoutDestination(supabase, {
    withdrawalId: withdrawal.id,
    producerId: user.id,
    producerName: profile.name,
    destination: input.destination,
  });

  await supabase
    .from("profiles")
    .update({
      [walletField]: currentBalance - input.amount,
    })
    .eq("id", user.id);

  // Every withdrawal now tries instant B2C automatically for every
  // producer — no paywall gate. If the active processor/method combo
  // can't auto-dispatch (or the attempt fails for any reason), it just
  // stays "pending" for admin to pay manually, exactly as before.
  const instant = await payWithdrawalB2C(withdrawal.id);

  // payWithdrawalB2C() already emails the producer when it succeeds
  // instantly — only the "still pending" case needs sending here.
  if (!instant.ok) {
    await sendWithdrawalRequestedEmail({
      producerEmail: profile.email,
      producerName: profile.name,
      amount: input.amount,
      netAmount,
      currency: profile.currency,
      payoutMethod: input.payoutMethod,
      destination: input.destination,
      instant: false,
    });
  }

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

  // payWithdrawalB2C() already emails the producer on success.
  const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).single();
  if (profile) {
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
