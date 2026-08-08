import { createAdminClient } from "@/lib/supabase/admin";

export const CTO_SHARE_PERCENT = 25;

const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2 year-round, no DST

// monthsAgo=0 is the current calendar month so far (for a live estimate);
// monthsAgo=1 is the last fully-closed calendar month (for the actual
// monthly credit, run on day 1 of the new month).
function maputoMonthBounds(monthsAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const local = new Date(now.getTime() + MAPUTO_OFFSET_MS);
  const startLocal = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsAgo, 1, 0, 0, 0));
  const endLocal = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsAgo + 1, 1, 0, 0, 0));
  return { start: new Date(startLocal.getTime() - MAPUTO_OFFSET_MS), end: new Date(endLocal.getTime() - MAPUTO_OFFSET_MS) };
}

// Same net-profit formula as getPlatformRevenue() in lib/data/admin.ts
// (sales fees + withdrawal fees - employee commissions), scoped to one
// calendar month instead of the rolling "this month so far" bucket.
export async function getPlatformNetProfitForMonth(monthsAgo: number): Promise<number> {
  const supabase = createAdminClient();
  const { start, end } = maputoMonthBounds(monthsAgo);

  const [{ data: orders }, { data: withdrawals }, { data: employeeCommissions }] = await Promise.all([
    supabase
      .from("orders")
      .select("platform_fee_amount, paid_at")
      .eq("status", "paid")
      .not("platform_fee_amount", "is", null)
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString()),
    supabase
      .from("withdrawals")
      .select("fee_amount, paid_at")
      .in("status", ["paid", "confirmed"])
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString()),
    supabase
      .from("employee_commissions")
      .select("amount, created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
  ]);

  const salesFees = (orders ?? []).reduce((sum, o) => sum + (o.platform_fee_amount ?? 0), 0);
  const withdrawalFees = (withdrawals ?? []).reduce((sum, w) => sum + w.fee_amount, 0);
  const commissions = (employeeCommissions ?? []).reduce((sum, c) => sum + c.amount, 0);
  return salesFees + withdrawalFees - commissions;
}

export interface CtoDashboardData {
  balanceAvailable: number;
  thisMonthEstimate: number;
  sharePercent: number;
}

export async function getCtoDashboardData(ctoId: string): Promise<CtoDashboardData> {
  const supabase = createAdminClient();
  const [{ data: profile }, thisMonthNetProfit] = await Promise.all([
    supabase.from("profiles").select("balance_available_cto").eq("id", ctoId).single(),
    getPlatformNetProfitForMonth(0),
  ]);

  return {
    balanceAvailable: profile?.balance_available_cto ?? 0,
    thisMonthEstimate: Math.round(thisMonthNetProfit * (CTO_SHARE_PERCENT / 100) * 100) / 100,
    sharePercent: CTO_SHARE_PERCENT,
  };
}

// Credits every active CTO's balance with 25% of last month's platform net
// profit. Called once a month (day 1, piggy-backing on the existing
// employee-payouts cron slot) — this only credits a balance, it never pays
// out automatically; the CTO requests a withdrawal like any producer does.
export async function creditMonthlyCtoShare(periodMonth: string) {
  const supabase = createAdminClient();
  const netProfit = await getPlatformNetProfitForMonth(1);
  const share = Math.max(0, Math.round(netProfit * (CTO_SHARE_PERCENT / 100) * 100) / 100);

  const { data: ctos } = await supabase.from("profiles").select("id, balance_available_cto").eq("is_cto", true);
  const results: { ctoId: string; amount: number; status: string }[] = [];

  for (const cto of ctos ?? []) {
    const { data: existing } = await supabase
      .from("cto_monthly_credits")
      .select("id")
      .eq("cto_id", cto.id)
      .eq("period_month", periodMonth)
      .maybeSingle();
    if (existing) {
      results.push({ ctoId: cto.id, amount: 0, status: "already_processed" });
      continue;
    }
    if (share <= 0) {
      results.push({ ctoId: cto.id, amount: 0, status: "no_profit" });
      continue;
    }

    await supabase.from("cto_monthly_credits").insert({
      cto_id: cto.id,
      amount: share,
      net_profit: netProfit,
      period_month: periodMonth,
    });
    await supabase
      .from("profiles")
      .update({ balance_available_cto: (cto.balance_available_cto ?? 0) + share })
      .eq("id", cto.id);
    results.push({ ctoId: cto.id, amount: share, status: "credited" });
  }

  return { netProfit, share, results };
}
