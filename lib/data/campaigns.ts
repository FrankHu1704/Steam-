import { createClient } from "@/lib/supabase/server";

export interface CampaignRow {
  source: string;
  medium: string;
  campaign: string;
  orders: number;
  paidOrders: number;
  revenue: number;
}

export async function getCampaignBreakdown(producerId: string): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("utm_source, utm_medium, utm_campaign, status, total_amount")
    .eq("producer_id", producerId)
    .not("utm_source", "is", null);

  const byKey = new Map<string, CampaignRow>();
  for (const o of data ?? []) {
    const source = o.utm_source ?? "—";
    const medium = o.utm_medium ?? "—";
    const campaign = o.utm_campaign ?? "—";
    const key = `${source}|${medium}|${campaign}`;
    const row = byKey.get(key) ?? { source, medium, campaign, orders: 0, paidOrders: 0, revenue: 0 };
    row.orders += 1;
    if (o.status === "paid") {
      row.paidOrders += 1;
      row.revenue += o.total_amount;
    }
    byKey.set(key, row);
  }

  return Array.from(byKey.values()).sort((a, b) => b.revenue - a.revenue);
}
