import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDailySalesReportEmail, sendAdminDailySummaryEmail } from "@/lib/email";

// Sends every producer an end-of-day summary of today's sales and
// withdrawals — runs daily at 17:30 Maputo time (see vercel.json; Maputo is
// UTC+2 year-round, no DST, so that's 15:30 UTC). Fires before midnight on
// purpose (it's an "end of business day" nudge, not a strict 00:00-23:59
// close-out), matching how similar platforms send this report.
const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000;

const CHECKOUT_METHOD_LABEL: Record<string, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "M-Kesh",
  visa_mastercard: "Cartão",
  payfast: "PayFast",
};
const PAYOUT_METHOD_LABEL: Record<string, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "M-Kesh",
  bank_transfer: "Transferência bancária",
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const nowUTC = new Date();
  const localNow = new Date(nowUTC.getTime() + MAPUTO_OFFSET_MS);
  const localMidnight = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0)
  );
  const startUTC = new Date(localMidnight.getTime() - MAPUTO_OFFSET_MS);
  const dateLabel = localNow.toLocaleDateString("pt-MZ", { timeZone: "UTC" });

  const [{ data: producers }, { data: admins }, { data: orders }, { data: withdrawals }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, currency").eq("role", "producer"),
    supabase.from("profiles").select("id, name, email, currency").eq("role", "admin"),
    supabase
      .from("orders")
      .select("producer_id, total_amount, platform_fee_amount, affiliate_commission_amount, payment_method, currency, products(title)")
      .eq("status", "paid")
      .gte("paid_at", startUTC.toISOString()),
    supabase
      .from("withdrawals")
      .select("producer_id, net_amount, payout_method, currency")
      .in("status", ["paid", "confirmed"])
      .gte("paid_at", startUTC.toISOString()),
  ]);

  type OrderRow = {
    producer_id: string;
    total_amount: number;
    platform_fee_amount: number | null;
    affiliate_commission_amount: number | null;
    payment_method: string | null;
    currency: string;
    products: { title: string } | null;
  };
  type WithdrawalRow = { producer_id: string; net_amount: number; payout_method: string; currency: string };

  const ordersByProducer = new Map<string, OrderRow[]>();
  for (const o of (orders ?? []) as unknown as OrderRow[]) {
    const list = ordersByProducer.get(o.producer_id) ?? [];
    list.push(o);
    ordersByProducer.set(o.producer_id, list);
  }
  const withdrawalsByProducer = new Map<string, WithdrawalRow[]>();
  for (const w of (withdrawals ?? []) as unknown as WithdrawalRow[]) {
    const list = withdrawalsByProducer.get(w.producer_id) ?? [];
    list.push(w);
    withdrawalsByProducer.set(w.producer_id, list);
  }

  let sent = 0;
  for (const producer of producers ?? []) {
    if (!producer.email) continue;
    const currency = (producer.currency as "MZN" | "ZAR") ?? "MZN";
    const producerOrders = ordersByProducer.get(producer.id) ?? [];
    const producerWithdrawals = withdrawalsByProducer.get(producer.id) ?? [];

    const totalSold = producerOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const commissions = producerOrders.reduce((sum, o) => sum + (o.platform_fee_amount ?? 0), 0);
    const sellerRevenue = producerOrders.reduce(
      (sum, o) => sum + (o.total_amount - (o.platform_fee_amount ?? 0) - (o.affiliate_commission_amount ?? 0)),
      0
    );
    const totalWithdrawn = producerWithdrawals.reduce((sum, w) => sum + w.net_amount, 0);

    const byProduct = new Map<string, { count: number; total: number }>();
    const byMethod = new Map<string, { count: number; total: number }>();
    for (const o of producerOrders) {
      const productTitle = o.products?.title ?? "Produto";
      const p = byProduct.get(productTitle) ?? { count: 0, total: 0 };
      p.count += 1;
      p.total += o.total_amount;
      byProduct.set(productTitle, p);

      const methodLabel = CHECKOUT_METHOD_LABEL[o.payment_method ?? ""] ?? o.payment_method ?? "—";
      const m = byMethod.get(methodLabel) ?? { count: 0, total: 0 };
      m.count += 1;
      m.total += o.total_amount;
      byMethod.set(methodLabel, m);
    }

    await sendDailySalesReportEmail({
      producerEmail: producer.email,
      producerName: producer.name,
      dateLabel,
      currency,
      salesCount: producerOrders.length,
      totalSold,
      commissions,
      sellerRevenue,
      totalWithdrawn,
      salesByProduct: Array.from(byProduct.entries()).map(([title, v]) => ({ title, ...v })),
      salesByMethod: Array.from(byMethod.entries()).map(([method, v]) => ({ method, ...v })),
      withdrawalsToday: producerWithdrawals.map((w) => ({
        method: PAYOUT_METHOD_LABEL[w.payout_method] ?? w.payout_method ?? "—",
        netAmount: w.net_amount,
      })),
    });
    sent += 1;
  }

  // Platform-wide totals — same 4 metrics as each producer's summary, just
  // aggregated across every order today instead of grouped by producer.
  const allOrders = orders ?? [];
  const platformTransactions = allOrders.length;
  const platformGrossVolume = allOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const platformCommissions = allOrders.reduce((sum, o) => sum + (o.platform_fee_amount ?? 0), 0);
  const platformNetToProducers = allOrders.reduce(
    (sum, o) => sum + (o.total_amount - (o.platform_fee_amount ?? 0) - (o.affiliate_commission_amount ?? 0)),
    0
  );

  let adminsSent = 0;
  for (const admin of admins ?? []) {
    if (!admin.email) continue;
    await sendAdminDailySummaryEmail({
      adminEmail: admin.email,
      dateLabel,
      currency: (admin.currency as "MZN" | "ZAR") ?? "MZN",
      transactionsCount: platformTransactions,
      grossVolume: platformGrossVolume,
      commissions: platformCommissions,
      netToProducers: platformNetToProducers,
    });
    adminsSent += 1;
  }

  return NextResponse.json({ ok: true, sent, adminsSent });
}
