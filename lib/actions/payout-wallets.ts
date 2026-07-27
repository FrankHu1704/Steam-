"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function savePayoutWallet(input: {
  method: "mpesa" | "emola";
  holderName: string;
  phone: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  if (!input.holderName.trim() || !input.phone.trim()) {
    return { error: "Nome do titular e telefone são obrigatórios." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("payout_wallets")
    .select("id")
    .eq("producer_id", user.id)
    .limit(1);
  const isFirstWallet = !existing?.length;

  const { error } = await admin.from("payout_wallets").upsert(
    {
      producer_id: user.id,
      method: input.method,
      holder_name: input.holderName.trim(),
      phone: input.phone.trim(),
      is_default: isFirstWallet,
    },
    { onConflict: "producer_id,method" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/withdrawals");
  return { ok: true };
}

export async function deletePayoutWallet(walletId: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  const { data: wallet } = await admin
    .from("payout_wallets")
    .select("*")
    .eq("id", walletId)
    .eq("producer_id", user.id)
    .single();
  if (!wallet) return { error: "Carteira não encontrada." };

  await admin.from("payout_wallets").delete().eq("id", walletId);

  if (wallet.is_default) {
    const { data: remaining } = await admin
      .from("payout_wallets")
      .select("id")
      .eq("producer_id", user.id)
      .limit(1);
    if (remaining?.[0]) {
      await admin.from("payout_wallets").update({ is_default: true }).eq("id", remaining[0].id);
    }
  }

  revalidatePath("/dashboard/withdrawals");
  return { ok: true };
}

export async function setDefaultPayoutWallet(walletId: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  const { data: wallet } = await admin
    .from("payout_wallets")
    .select("id")
    .eq("id", walletId)
    .eq("producer_id", user.id)
    .single();
  if (!wallet) return { error: "Carteira não encontrada." };

  await admin.from("payout_wallets").update({ is_default: false }).eq("producer_id", user.id);
  await admin.from("payout_wallets").update({ is_default: true }).eq("id", walletId);

  revalidatePath("/dashboard/withdrawals");
  return { ok: true };
}
