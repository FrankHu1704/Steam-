import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "@/types/database";

export interface CouponWithProduct extends Coupon {
  product_title: string | null;
}

export async function getMyCoupons(producerId: string): Promise<CouponWithProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select("*, products(title)")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as (Coupon & { products: { title: string } | null })[]).map((c) => ({
    ...c,
    product_title: c.products?.title ?? null,
  }));
}
