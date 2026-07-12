"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PayoutMethod } from "@/types/database";

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
    .select("balance_available, currency")
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

  return { withdrawalId: withdrawal.id as string };
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
