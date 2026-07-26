import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/types/database";

export interface ProducerOrder extends Order {
  product_title: string;
}

export async function getProducerOrders(producerId: string, status?: string): Promise<ProducerOrder[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*, products(title)")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return ((data ?? []) as (Order & { products: { title: string } | null })[]).map((o) => ({
    ...o,
    product_title: o.products?.title ?? "Produto",
  }));
}
