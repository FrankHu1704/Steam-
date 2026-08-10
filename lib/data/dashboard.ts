import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/types/database";

export interface TopProduct {
  id: string;
  title: string;
  salesCount: number;
  revenue: number;
  viewCount: number;
  conversionPercent: number | null;
}

export interface DashboardStats {
  salesToday: number;
  salesMonth: number;
  profitMonth: number;
  salesMonthChangePercent: number | null;
  ordersCount: number;
  customersCount: number;
  chart: { date: string; total: number; label: string }[];
  topProducts: TopProduct[];
  recentSales: (Order & { product_title: string })[];
}

export const DASHBOARD_PERIODS = [7, 30, 90, 180, 365, "all"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export function dashboardPeriodLabel(period: DashboardPeriod): string {
  if (period === "all") return "Tudo";
  if (period === 180) return "6m";
  if (period === 365) return "1a";
  return `${period}d`;
}

type ChartGranularity = "day" | "week" | "month";

function chartGranularityFor(period: DashboardPeriod): ChartGranularity {
  if (period === "all") return "month";
  if (period > 90) return "week";
  return "day";
}

function stepDate(d: Date, granularity: ChartGranularity): Date {
  const next = new Date(d);
  if (granularity === "day") next.setDate(next.getDate() + 1);
  else if (granularity === "week") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function bucketKeyFor(d: Date, granularity: ChartGranularity): string {
  if (granularity === "month") return d.toISOString().slice(0, 7);
  return d.toISOString().slice(0, 10);
}

function bucketLabelFor(d: Date, granularity: ChartGranularity): string {
  if (granularity === "month") return d.toLocaleDateString("pt-MZ", { month: "short", year: "2-digit" });
  if (granularity === "week") return d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "2-digit" });
  return d.toISOString().slice(5, 10);
}

export async function getDashboardStats(producerId: string, period: DashboardPeriod = 30): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfLastMonth = new Date(startOfMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const granularity = chartGranularityFor(period);

  let chartStart: Date;
  if (period === "all") {
    const { data: earliest } = await supabase
      .from("orders")
      .select("paid_at")
      .eq("producer_id", producerId)
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    chartStart = earliest?.paid_at ? new Date(earliest.paid_at) : new Date();
    chartStart.setDate(1);
    chartStart.setHours(0, 0, 0, 0);
  } else {
    chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - (period - 1));
    chartStart.setHours(0, 0, 0, 0);
  }

  const { data: paidOrders } = await supabase
    .from("orders")
    .select("*, products(id, title)")
    .eq("producer_id", producerId)
    .eq("status", "paid")
    .gte("paid_at", chartStart.toISOString())
    .order("paid_at", { ascending: false });

  const orders = (paidOrders ?? []) as (Order & { products: { id: string; title: string } | null })[];

  let salesToday = 0;
  let salesMonth = 0;
  let profitMonth = 0;
  const byBucket = new Map<string, { total: number; label: string }>();
  {
    const now = new Date();
    let cursor = new Date(chartStart);
    let guard = 0;
    while (cursor <= now && guard < 400) {
      byBucket.set(bucketKeyFor(cursor, granularity), { total: 0, label: bucketLabelFor(cursor, granularity) });
      cursor = stepDate(cursor, granularity);
      guard++;
    }
  }

  const productMap = new Map<string, TopProduct>();

  for (const order of orders) {
    if (!order.paid_at) continue;
    const paidAt = new Date(order.paid_at);

    let bucketKey: string;
    if (granularity === "month") {
      bucketKey = paidAt.toISOString().slice(0, 7);
    } else if (granularity === "week") {
      const diffDays = Math.floor((paidAt.getTime() - chartStart.getTime()) / 86_400_000);
      const weekStart = new Date(chartStart);
      weekStart.setDate(weekStart.getDate() + Math.floor(diffDays / 7) * 7);
      bucketKey = bucketKeyFor(weekStart, granularity);
    } else {
      bucketKey = paidAt.toISOString().slice(0, 10);
    }
    const bucket = byBucket.get(bucketKey);
    if (bucket) bucket.total += order.total_amount;

    if (paidAt >= startOfToday) salesToday += order.total_amount;
    if (paidAt >= startOfMonth) {
      salesMonth += order.total_amount;
      profitMonth += order.total_amount - (order.affiliate_commission_amount ?? 0);
    }

    // Manual API charges (no product_id) aren't ranked here — there's no
    // product to attribute the sale to.
    const productId = order.products?.id ?? order.product_id;
    if (!productId) continue;
    const entry = productMap.get(productId) ?? {
      id: productId,
      title: order.products?.title ?? "Produto",
      salesCount: 0,
      revenue: 0,
      viewCount: 0,
      conversionPercent: null,
    };
    entry.salesCount += 1;
    entry.revenue += order.total_amount;
    productMap.set(productId, entry);
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (topProducts.length > 0) {
    const { data: viewRows } = await supabase
      .from("products")
      .select("id, view_count")
      .in("id", topProducts.map((p) => p.id));
    const viewsById = new Map((viewRows ?? []).map((v) => [v.id, v.view_count as number]));
    for (const p of topProducts) {
      p.viewCount = viewsById.get(p.id) ?? 0;
      p.conversionPercent = p.viewCount > 0 ? Math.round((p.salesCount / p.viewCount) * 1000) / 10 : null;
    }
  }

  const { data: allBuyers } = await supabase
    .from("orders")
    .select("buyer_email")
    .eq("producer_id", producerId)
    .eq("status", "paid");
  const customersCount = new Set((allBuyers ?? []).map((o) => o.buyer_email)).size;

  const { data: lastMonthOrders } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("producer_id", producerId)
    .eq("status", "paid")
    .gte("paid_at", startOfLastMonth.toISOString())
    .lt("paid_at", startOfMonth.toISOString());
  const salesLastMonth = (lastMonthOrders ?? []).reduce((sum, o) => sum + o.total_amount, 0);
  const salesMonthChangePercent =
    salesLastMonth > 0 ? Math.round(((salesMonth - salesLastMonth) / salesLastMonth) * 1000) / 10 : null;

  return {
    salesToday,
    salesMonth,
    profitMonth,
    salesMonthChangePercent,
    ordersCount: orders.length,
    customersCount,
    chart: Array.from(byBucket.entries()).map(([date, v]) => ({ date, total: v.total, label: v.label })),
    topProducts,
    recentSales: orders.slice(0, 8).map((o) => ({ ...o, product_title: o.products?.title ?? "Produto" })),
  };
}
