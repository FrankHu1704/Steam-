"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePaymentProvider, providerModule } from "@/lib/payments";
import { completeDebtPayment, notifyNegativeBalance } from "@/lib/debt-fulfillment";
import type { ActionResult } from "@/lib/actions/auth";

// Scoped to the regular producer wallet (balance_available) — the only
// one shown as "Saldo Produtor" in the admin panel and the one the debt
// card on /dashboard reads from. The dev/CTO wallets can still go
// negative (see adminAdjustBalance), but don't have a self-serve payoff
// flow yet.
const WALLET_FIELD = "balance_available";

export async function getDebtAmount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase.from("profiles").select(WALLET_FIELD).eq("id", user.id).single();
  const balance = (profile as Record<string, number> | null)?.[WALLET_FIELD] ?? 0;
  return balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;
}

// Mirrors requestProductionUnlock() (lib/actions/developer.ts) — same
// one-off-charge shape, just crediting the debtor's own wallet back
// instead of unlocking a feature.
export async function requestDebtPayment(
  phone: string,
  paymentMethod: "mpesa" | "emola"
): Promise<ActionResult & { debtPaymentId?: string; status?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!phone.trim()) return { error: "Indique o número de telemóvel para o pagamento." };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const balance = (profile as Record<string, number> | null)?.[WALLET_FIELD] ?? 0;
  if (balance >= 0) return { error: "A sua conta não tem dívida por pagar." };

  const amount = Math.round(Math.abs(balance) * 100) / 100;
  const admin = createAdminClient();
  const providerName = await getActivePaymentProvider();

  const { data: debt, error: debtError } = await admin
    .from("debt_payments")
    .insert({
      producer_id: user.id,
      wallet_field: WALLET_FIELD,
      amount,
      currency: profile?.currency ?? "MZN",
      provider: providerName,
      status: "pending",
    })
    .select("id")
    .single();
  if (debtError || !debt) return { error: debtError?.message ?? "Falha ao iniciar o pagamento." };

  try {
    const charge = await providerModule(providerName).createCharge({
      paymentMethod,
      amount,
      currency: (profile?.currency as "MZN" | "ZAR") ?? "MZN",
      sourceId: debt.id,
      customerName: profile?.name ?? "Produtor PayNow",
      customerEmail: profile?.email ?? "",
      customerPhone: phone,
    });
    await admin.from("debt_payments").update({ provider_payment_id: charge.payment_id }).eq("id", debt.id);
    return { debtPaymentId: debt.id, status: charge.status };
  } catch (err) {
    await admin.from("debt_payments").update({ status: "failed" }).eq("id", debt.id);
    return { error: (err as Error).message };
  }
}

export async function checkDebtPaymentStatus(debtPaymentId: string): Promise<{ status: string }> {
  const admin = createAdminClient();
  const { data: debt } = await admin.from("debt_payments").select("*").eq("id", debtPaymentId).single();
  if (!debt) return { status: "failed" };
  if (debt.status !== "pending") return { status: debt.status };

  if (debt.provider_payment_id) {
    try {
      const remote = await providerModule(debt.provider).checkChargeStatus(debt.provider_payment_id);
      if (remote.status === "success") {
        const result = await completeDebtPayment(debtPaymentId);
        if (result.error) return { status: "failed" };
        return { status: "paid" };
      }
      if (remote.status === "failed") {
        await admin.from("debt_payments").update({ status: "failed" }).eq("id", debtPaymentId);
        return { status: "failed" };
      }
    } catch {
      // best-effort reconciliation; the next poll tries again
    }
  }
  return { status: "pending" };
}

// The "Lembrar" button on the debt card — an on-demand resend of the
// same email+SMS the account already gets automatically (on every sale
// while in debt, and once a day via the negative-balance cron), for
// whenever the producer wants a fresh copy on hand.
export async function remindDebt(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  await notifyNegativeBalance({ producerId: user.id, walletField: WALLET_FIELD });
  return {};
}
