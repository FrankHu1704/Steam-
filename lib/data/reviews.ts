import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types/database";

export interface ProductReview extends Review {
  buyer_name: string;
}

// Reviews are publicly readable (RLS: "reviews: public read"), so the
// regular anon-key client works fine here even for logged-out visitors.
export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles!buyer_id(name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as (Review & { profiles: { name: string } | null })[]).map((r) => ({
    ...r,
    buyer_name: r.profiles?.name ?? "Comprador",
  }));
}

export interface RatingSummary {
  average: number;
  count: number;
}

export async function getProductRatingSummary(productId: string): Promise<RatingSummary> {
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("rating").eq("product_id", productId);
  const ratings = (data ?? []).map((r) => r.rating);
  if (ratings.length === 0) return { average: 0, count: 0 };
  return {
    average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
    count: ratings.length,
  };
}

export async function getReviewedOrderIds(buyerId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("order_id").eq("buyer_id", buyerId);
  return new Set((data ?? []).map((r) => r.order_id));
}

export interface ProducerReview extends Review {
  buyer_name: string;
  product_title: string;
}

export async function getProducerReviews(producerId: string): Promise<ProducerReview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles!buyer_id(name), products!inner(title, producer_id)")
    .eq("products.producer_id", producerId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as (Review & {
    profiles: { name: string } | null;
    products: { title: string } | null;
  })[]).map((r) => ({
    ...r,
    buyer_name: r.profiles?.name ?? "Comprador",
    product_title: r.products?.title ?? "Produto",
  }));
}
