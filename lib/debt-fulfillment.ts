import { createAdminClient } from "@/lib/supabase/admin";
import { sendNegativeBalanceEmail, sendDebtPaidEmail } from "@/lib/email";
import { sendNegativeBalanceSms } from "@/lib/easyhost-sms";

type ProducerBalanceRow = {
  name: string;
  email: string;
  phone: string | null;
  currency: string;
} & Record<string, number>;

// Best-effort — fired right after any write that can push a wallet
// negative (a sale that only partly covers existing debt, an admin
// debit, the daily debt cron). Never throws, never blocks the caller's
// own flow. No-op if the wallet isn't actually negative, so every call
// site can call this unconditionally after touching a balance.
export async function notifyNegativeBalance(input: { producerId: string; walletField?: string }): Promise<void> {
  const walletField = input.walletField ?? "balance_available";
  const supabase = createAdminClient();
  const { data: producer } = await supabase
    .from("profiles")
    .select(`name, email, phone, currency, ${walletField}`)
    .eq("id", input.producerId)
    .single<ProducerBalanceRow>();
  if (!producer) return;

  const balance = producer[walletField];
  if (balance == null || balance >= 0) return;

  const debtAmount = Math.round(Math.abs(balance) * 100) / 100;

  if (producer.email) {
    await sendNegativeBalanceEmail({ to: producer.email, name: producer.name, debtAmount, currency: producer.currency });
  }
  if (producer.phone) {
    await sendNegativeBalanceSms({ phone: producer.phone, debtAmount, currency: producer.currency });
  }
}

// Called once a debt_payments charge is confirmed paid (via the client-side
// poll in checkDebtPaymentStatus — see lib/actions/debt.ts). Idempotent via
// status, same guard style as creditOrder()/refundOrder(). Unlike a normal
// sale, the full amount goes back onto the wallet — no platform fee, since
// this is the producer paying off their own debt, not earning a new one.
export async function completeDebtPayment(debtPaymentId: string): Promise<{ handled: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: debt } = await supabase.from("debt_payments").select("*").eq("id", debtPaymentId).single();
  if (!debt) return { handled: false };
  if (debt.status === "paid") return { handled: true };

  const walletField = debt.wallet_field ?? "balance_available";
  const { data: producer } = await supabase
    .from("profiles")
    .select(`name, email, phone, currency, ${walletField}`)
    .eq("id", debt.producer_id)
    .single<ProducerBalanceRow>();
  if (!producer) return { handled: true, error: "Utilizador não encontrado." };

  const newBalance = Math.round(((producer[walletField] ?? 0) + Number(debt.amount)) * 100) / 100;

  await supabase.from("profiles").update({ [walletField]: newBalance }).eq("id", debt.producer_id);
  await supabase.from("debt_payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", debt.id);

  const remainingDebt = newBalance < 0 ? Math.abs(newBalance) : 0;

  await supabase.from("notifications").insert({
    user_id: debt.producer_id,
    type: "admin_message",
    title: "Pagamento de dívida recebido",
    message:
      remainingDebt > 0
        ? `Pagou ${Number(debt.amount).toLocaleString("pt-MZ")} ${debt.currency} da sua dívida. Ainda tem ${remainingDebt.toLocaleString("pt-MZ")} ${debt.currency} em dívida.`
        : `Pagou ${Number(debt.amount).toLocaleString("pt-MZ")} ${debt.currency} — a sua conta já não tem dívida pendente.`,
  });

  if (producer.email) {
    await sendDebtPaidEmail({
      to: producer.email,
      name: producer.name,
      amountPaid: Number(debt.amount),
      remainingDebt,
      currency: debt.currency,
    });
  }

  return { handled: true };
}
