import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENT_TIERS, PUBLIC_BADGE_MIN_INDEX, tierForSalesCount } from "@/lib/data/achievements";
import type { Category, Product } from "@/types/database";

export interface MarketplaceListing extends Product {
  producer_name: string;
  category_name: string | null;
  ratingAverage: number;
  ratingCount: number;
  producerBadge: { label: string; icon: string } | null;
}

export type MarketplaceSort = "vendidos" | "recentes" | "menor_preco" | "maior_preco";

export async function getMarketplaceProducts(
  opts: { search?: string; categorySlug?: string; sort?: MarketplaceSort } = {}
): Promise<MarketplaceListing[]> {
  const supabase = await createClient();

  let categoryId: string | null = null;
  if (opts.categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", opts.categorySlug).single();
    categoryId = category?.id ?? null;
  }

  let query = supabase
    .from("products")
    .select("*, profiles!producer_id(name, lifetime_sales_count), categories(name)")
    .eq("status", "approved");

  if (opts.search) query = query.ilike("title", `%${opts.search}%`);
  if (categoryId) query = query.eq("category_id", categoryId);

  if (opts.sort === "recentes") query = query.order("created_at", { ascending: false });
  else query = query.order("sales_count", { ascending: false });

  const { data } = await query;
  const products = (data ?? []) as (Product & {
    profiles: { name: string; lifetime_sales_count: number } | null;
    categories: { name: string } | null;
  })[];

  const productIds = products.map((p) => p.id);
  const ratingByProduct = new Map<string, { total: number; count: number }>();
  if (productIds.length > 0) {
    const { data: reviews } = await supabase.from("reviews").select("product_id, rating").in("product_id", productIds);
    for (const r of reviews ?? []) {
      const entry = ratingByProduct.get(r.product_id) ?? { total: 0, count: 0 };
      entry.total += r.rating;
      entry.count += 1;
      ratingByProduct.set(r.product_id, entry);
    }
  }

  let listings: MarketplaceListing[] = products.map((p) => {
    const rating = ratingByProduct.get(p.id);
    const { currentTier } = tierForSalesCount(p.profiles?.lifetime_sales_count ?? 0);
    const tierIndex = ACHIEVEMENT_TIERS.findIndex((t) => t.key === currentTier.key);
    return {
      ...p,
      producer_name: p.profiles?.name ?? "Produtor",
      category_name: p.categories?.name ?? null,
      ratingAverage: rating ? Math.round((rating.total / rating.count) * 10) / 10 : 0,
      ratingCount: rating?.count ?? 0,
      producerBadge: tierIndex >= PUBLIC_BADGE_MIN_INDEX ? { label: currentTier.label, icon: currentTier.icon } : null,
    };
  });

  if (opts.sort === "menor_preco") {
    listings = listings.sort((a, b) => (a.promo_price ?? a.price) - (b.promo_price ?? b.price));
  } else if (opts.sort === "maior_preco") {
    listings = listings.sort((a, b) => (b.promo_price ?? b.price) - (a.promo_price ?? a.price));
  }

  return listings;
}

export async function getMarketplaceCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data as Category[]) ?? [];
}
