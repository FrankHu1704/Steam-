import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/types/database";

export interface DashboardStats {
  salesToday: number;
  salesMonth: number;
  profitMonth: number;
  ordersCount: number;
  customersCount: number;
  chart: { date: string; total: number }[];
  recentSales: (Order & { product_title: string })[];
}

const CHART_DAYS = 14;

export async function getDashboardStats(producerId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const chartStart = new Date();
  chartStart.setDate(chartStart.getDate() - (CHART_DAYS - 1));
  chartStart.setHours(0, 0, 0, 0);

  const { data: paidOrders } = await supabase
    .from("orders")
    .select("*, products(title)")
    .eq("producer_id", producerId)
    .eq("status", "paid")
    .gte("paid_at", chartStart.toISOString())
    .order("paid_at", { ascending: false });

  const orders = (paidOrders ?? []) as (Order & { products: { title: string } | null })[];

  let salesToday = 0;
  let salesMonth = 0;
  let profitMonth = 0;
  const byDay = new Map<string, number>();
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date(chartStart);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }

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
  }

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
    recentSales: orders.slice(0, 8).map((o) => ({ ...o, product_title: o.products?.title ?? "Produto" })),
  };
}
