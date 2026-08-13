import { createAdminClient } from "@/lib/supabase/admin";
import { maputoMonthBounds, getPlatformNetProfitForRange } from "@/lib/cto";

export interface SponsorDashboardData {
  balanceAvailable: number;
  thisMonthEstimate: number;
  sharePercent: number;
  contractStartedAt: string | null;
}

export async function getSponsorDashboardData(sponsorId: string): Promise<SponsorDashboardData> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("balance_available_sponsor, sponsor_share_percent, sponsor_contract_started_at")
    .eq("id", sponsorId)
    .single();

  const sharePercent = profile?.sponsor_share_percent ?? 0;
  const { start, end } = maputoMonthBounds(0);
  const contractStartedAt = profile?.sponsor_contract_started_at ? new Date(profile.sponsor_contract_started_at) : null;
  const effectiveStart = contractStartedAt && contractStartedAt > start ? contractStartedAt : start;

  const thisMonthNetProfit =
    !contractStartedAt || contractStartedAt < end ? await getPlatformNetProfitForRange(effectiveStart, end) : 0;

  return {
    balanceAvailable: profile?.balance_available_sponsor ?? 0,
    thisMonthEstimate: Math.round(thisMonthNetProfit * (sharePercent / 100) * 100) / 100,
    sharePercent,
    contractStartedAt: profile?.sponsor_contract_started_at ?? null,
  };
}

// Credits every active sponsor's balance with their own admin-defined %
// of last month's platform net profit — clamped to whatever portion of
// that month falls on/after their contract start, so nothing accrues for
// profit generated before sponsor_contract_started_at. A sponsor whose
// contract hasn't started yet by the end of the period gets nothing this
// round (not even a zero-amount credit row, so they still get a first
// real credit once their contract does start). Called once a month (day
// 1, same cron slot as creditMonthlyCtoShare in lib/cto.ts).
export async function creditMonthlySponsorShare(periodMonth: string) {
  const supabase = createAdminClient();
  const { start: monthStart, end: monthEnd } = maputoMonthBounds(1);

  const { data: sponsors } = await supabase
    .from("profiles")
    .select("id, balance_available_sponsor, sponsor_share_percent, sponsor_contract_started_at")
    .eq("is_sponsor", true);

  const results: { sponsorId: string; amount: number; status: string }[] = [];

  for (const sponsor of sponsors ?? []) {
    const sharePercent = sponsor.sponsor_share_percent;
    if (!sharePercent || sharePercent <= 0) {
      results.push({ sponsorId: sponsor.id, amount: 0, status: "no_share_percent" });
      continue;
    }

    const contractStartedAt = sponsor.sponsor_contract_started_at ? new Date(sponsor.sponsor_contract_started_at) : null;
    if (contractStartedAt && contractStartedAt >= monthEnd) {
      results.push({ sponsorId: sponsor.id, amount: 0, status: "contract_not_started" });
      continue;
    }

    const { data: existing } = await supabase
      .from("sponsor_monthly_credits")
      .select("id")
      .eq("sponsor_id", sponsor.id)
      .eq("period_month", periodMonth)
      .maybeSingle();
    if (existing) {
      results.push({ sponsorId: sponsor.id, amount: 0, status: "already_processed" });
      continue;
    }

    const effectiveStart = contractStartedAt && contractStartedAt > monthStart ? contractStartedAt : monthStart;
    const netProfit = await getPlatformNetProfitForRange(effectiveStart, monthEnd);
    const share = Math.max(0, Math.round(netProfit * (sharePercent / 100) * 100) / 100);

    if (share <= 0) {
      results.push({ sponsorId: sponsor.id, amount: 0, status: "no_profit" });
      continue;
    }

    await supabase.from("sponsor_monthly_credits").insert({
      sponsor_id: sponsor.id,
      amount: share,
      net_profit: netProfit,
      share_percent: sharePercent,
      period_month: periodMonth,
    });
    await supabase
      .from("profiles")
      .update({ balance_available_sponsor: (sponsor.balance_available_sponsor ?? 0) + share })
      .eq("id", sponsor.id);
    results.push({ sponsorId: sponsor.id, amount: share, status: "credited" });
  }

  return { results };
}
