import { createClient } from "@/lib/supabase/server";
import type { Affiliate, Product } from "@/types/database";

export interface MarketplaceProduct extends Product {
  producer_name: string;
}

export async function getAffiliateMarketplace(): Promise<MarketplaceProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, profiles!producer_id(name)")
    .eq("status", "approved")
    .eq("affiliate_enabled", true)
    .order("sales_count", { ascending: false });

  return ((data ?? []) as (Product & { profiles: { name: string } | null })[]).map((p) => ({
    ...p,
    producer_name: p.profiles?.name ?? "Produtor",
  }));
}

export interface MyAffiliateLink extends Affiliate {
  product_title: string;
  product_slug: string;
}

export async function getMyAffiliateLinks(): Promise<MyAffiliateLink[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("affiliates").select("*, products(title, slug)").order("created_at", {
    ascending: false,
  });

  return ((data ?? []) as (Affiliate & { products: { title: string; slug: string } | null })[]).map((a) => ({
    ...a,
    product_title: a.products?.title ?? "Produto",
    product_slug: a.products?.slug ?? "",
  }));
}

export interface ProducerAffiliateRow extends Affiliate {
  product_title: string;
  affiliate_name: string;
}

export async function getProducerAffiliates(producerId: string): Promise<ProducerAffiliateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("affiliates")
    .select("*, products!inner(title, producer_id), profiles(name)")
    .eq("products.producer_id", producerId)
    .order("commission_earned", { ascending: false });

  return ((data ?? []) as (Affiliate & {
    products: { title: string } | null;
    profiles: { name: string } | null;
  })[]).map((a) => ({
    ...a,
    product_title: a.products?.title ?? "Produto",
    affiliate_name: a.profiles?.name ?? "Afiliado",
  }));
}
