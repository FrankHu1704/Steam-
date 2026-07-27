"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeProductWithGroq } from "@/lib/groq";

export async function analyzeProduct(productId: string): Promise<{ analysis?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("producer_id", user.id)
    .single();
  if (!product) return { error: "Produto não encontrado." };

  let categoryName: string | null = null;
  if (product.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", product.category_id)
      .single();
    categoryName = category?.name ?? null;
  }

  const result = await analyzeProductWithGroq({
    title: product.title,
    description: product.description,
    price: product.price,
    promoPrice: product.promo_price,
    currency: product.currency,
    categoryName,
    salesCount: product.sales_count,
    viewCount: product.view_count,
  });

  if (result.error) return { error: result.error };

  const admin = createAdminClient();
  await admin
    .from("products")
    .update({ ai_analysis: result.analysis, ai_analysis_at: new Date().toISOString() })
    .eq("id", productId);

  revalidatePath(`/dashboard/products/${productId}`);
  return { analysis: result.analysis };
}
