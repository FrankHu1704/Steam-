import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/types/database";

export interface MarketplaceListing extends Product {
  producer_name: string;
  category_name: string | null;
}

export async function getMarketplaceProducts(opts: { search?: string; categorySlug?: string } = {}): Promise<
  MarketplaceListing[]
> {
  const supabase = await createClient();

  let categoryId: string | null = null;
  if (opts.categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", opts.categorySlug).single();
    categoryId = category?.id ?? null;
  }

  let query = supabase
    .from("products")
    .select("*, profiles!producer_id(name), categories(name)")
    .eq("status", "approved")
    .order("sales_count", { ascending: false });

  if (opts.search) query = query.ilike("title", `%${opts.search}%`);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data } = await query;
  return ((data ?? []) as (Product & { profiles: { name: string } | null; categories: { name: string } | null })[]).map(
    (p) => ({
      ...p,
      producer_name: p.profiles?.name ?? "Produtor",
      category_name: p.categories?.name ?? null,
    })
  );
}

export async function getMarketplaceCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data as Category[]) ?? [];
}
