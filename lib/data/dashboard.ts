import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/types/database";

export interface TopProduct {
  id: string;
  title: string;
  salesCount: number;
  revenue: number;
}

export interface DashboardStats {
  salesToday: number;
  salesMonth: number;
  profitMonth: number;
  ordersCount: number;
  customersCount: number;
  chart: { date: string; total: number }[];
  topProducts: TopProduct[];
  recentSales: (Order & { product_title: string })[];
}

export const DASHBOARD_PERIODS = [7, 14, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export async function getDashboardStats(producerId: string, days: DashboardPeriod = 14): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const chartStart = new Date();
  chartStart.setDate(chartStart.getDate() - (days - 1));
  chartStart.setHours(0, 0, 0, 0);

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
  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(chartStart);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }

  const productMap = new Map<string, TopProduct>();

  for (const order of orders) {
    if (!order.paid_at) continue;
    const paidAt = new Date(order.paid_at);
    const day = paidAt.toISOString().slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + order.total_amount);

    if (paidAt >= startOfToday) salesToday += order.total_amount;
    if (paidAt >= startOfMonth) {
      salesMonth += order.total_amount;
      profitMonth += order.total_amount - (order.affiliate_commission_amount ?? 0);
    }

    const productId = order.products?.id ?? order.product_id;
    const entry = productMap.get(productId) ?? {
      id: productId,
      title: order.products?.title ?? "Produto",
      salesCount: 0,
      revenue: 0,
    };
    entry.salesCount += 1;
    entry.revenue += order.total_amount;
    productMap.set(productId, entry);
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const { data: allBuyers } = await supabase
    .from("orders")
    .select("buyer_email")
    .eq("producer_id", producerId)
    .eq("status", "paid");
  const customersCount = new Set((allBuyers ?? []).map((o) => o.buyer_email)).size;

  return {
    salesToday,
    salesMonth,
    profitMonth,
    ordersCount: orders.length,
    customersCount,
    chart: Array.from(byDay.entries()).map(([date, total]) => ({ date, total })),
    topProducts,
    recentSales: orders.slice(0, 8).map((o) => ({ ...o, product_title: o.products?.title ?? "Produto" })),
  };
}
