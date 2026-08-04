import { createClient } from "@/lib/supabase/server";
import type { Affiliate, Product } from "@/types/database";

export interface ReferredAffiliateCommission {
  id: string;
  affiliateName: string;
  amount: number;
  createdAt: string;
}

export interface ProducerAffiliateReferralOverview {
  recruitedCount: number;
  totalEarned: number;
  recentCommissions: ReferredAffiliateCommission[];
}

// Producers can recruit affiliates via their own referral link (see
// ReferralLinkCard on /dashboard/affiliates) and earn 3% of that
// affiliate's sales for 1 month — mirrors the employee-recruits-producer
// program, applied in lib/order-fulfillment.ts.
export async function getProducerAffiliateReferralOverview(
  producerId: string
): Promise<ProducerAffiliateReferralOverview> {
  const supabase = await createClient();

  const [{ count: recruitedCount }, { data: allCommissions }, { data: recentCommissions }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("recruited_by_producer_id", producerId),
    supabase.from("producer_affiliate_commissions").select("amount").eq("producer_id", producerId),
    supabase
      .from("producer_affiliate_commissions")
      .select("id, amount, created_at, profiles!affiliate_id(name)")
      .eq("producer_id", producerId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const recentRows = (recentCommissions ?? []) as unknown as {
    id: string;
    amount: number;
    created_at: string;
    profiles: { name: string } | null;
  }[];

  return {
    recruitedCount: recruitedCount ?? 0,
    totalEarned: (allCommissions ?? []).reduce((sum, r) => sum + r.amount, 0),
    recentCommissions: recentRows.map((r) => ({
      id: r.id,
      affiliateName: r.profiles?.name ?? "Afiliado",
      amount: r.amount,
      createdAt: r.created_at,
    })),
  };
}

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
