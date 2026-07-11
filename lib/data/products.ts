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
