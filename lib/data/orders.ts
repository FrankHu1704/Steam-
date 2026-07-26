import { createClient } from "@/lib/supabase/server";
import type { Order, ProductType } from "@/types/database";

export interface ProducerOrder extends Order {
  product_title: string;
  product_type: ProductType;
}

export async function getProducerOrders(producerId: string, status?: string): Promise<ProducerOrder[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*, products(title, product_type)")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (
    (data ?? []) as (Order & { products: { title: string; product_type: ProductType } | null })[]
  ).map((o) => ({
    ...o,
    product_title: o.products?.title ?? "Produto",
    product_type: o.products?.product_type ?? "digital",
  }));
}
