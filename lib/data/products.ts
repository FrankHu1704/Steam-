import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/types/database";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data as Category[]) ?? [];
}

export async function getMyProducts(producerId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: false });
  return (data as Product[]) ?? [];
}

export async function getProductForOwner(id: string, producerId: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("producer_id", producerId)
    .single();
  return data as Product | null;
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();
  return data as Product | null;
}

// Other approved products of the same producer that could be picked as an
// order bump for a given product (excludes the product itself).
export async function getBumpCandidates(producerId: string, excludeProductId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("producer_id", producerId)
    .eq("status", "approved")
    .neq("id", excludeProductId)
    .order("title");
  return (data as Product[]) ?? [];
}

export async function getBumpOfferIds(productId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_bump_offers")
    .select("bump_product_id")
    .eq("product_id", productId)
    .order("sort_order");
  return (data ?? []).map((r) => r.bump_product_id as string);
}

export interface UpsellOffer {
  upsellProductId: string;
  customPrice: number | null;
}

export async function getUpsellOffer(productId: string): Promise<UpsellOffer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_upsells")
    .select("upsell_product_id, custom_price")
    .eq("product_id", productId)
    .maybeSingle();
  if (!data) return null;
  return { upsellProductId: data.upsell_product_id as string, customPrice: data.custom_price as number | null };
}
