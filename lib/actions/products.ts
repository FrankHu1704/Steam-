"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/auth";

interface UpsertProductInput {
  id?: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  promoPrice: number | null;
  currency: "MZN" | "ZAR";
  coverImageUrl: string | null;
  videoUrl: string | null;
  affiliateEnabled: boolean;
  affiliateCommissionPercent: number;
  seoTitle: string | null;
  seoDescription: string | null;
  productType: "digital" | "physical";
  stockQuantity: number | null;
  files: { name: string; storage_path: string; size_bytes: number }[];
}

export async function upsertProduct(input: UpsertProductInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  if (!input.title || input.price <= 0) {
    return { error: "Título e preço (maior que zero) são obrigatórios." };
  }
  if (input.promoPrice != null && input.promoPrice >= input.price) {
    return { error: "O preço promocional deve ser menor que o preço normal." };
  }
  if (input.productType === "physical" && (input.stockQuantity == null || input.stockQuantity < 0)) {
    return { error: "Indique a quantidade em estoque do produto físico." };
  }

  const baseSlug = slugify(input.title);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    producer_id: user.id,
    category_id: input.categoryId || null,
    title: input.title,
    description: input.description,
    price: input.price,
    promo_price: input.promoPrice,
    currency: input.currency,
    cover_image_url: input.coverImageUrl,
    video_url: input.videoUrl,
    affiliate_enabled: input.affiliateEnabled,
    affiliate_commission_percent: Math.min(90, Math.max(0, input.affiliateCommissionPercent)),
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    product_type: input.productType,
    stock_quantity: input.productType === "physical" ? input.stockQuantity : null,
  };

  let productId = input.id;

  if (productId) {
    const { error } = await supabase
      .from("products")
      .update({ ...payload, status: "pending" })
      .eq("id", productId)
      .eq("producer_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, slug, status: "pending" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    productId = data!.id as string;
  }

  if (input.files.length > 0) {
    await supabase.from("product_files").delete().eq("product_id", productId);
    const { error: filesError } = await supabase.from("product_files").insert(
      input.files.map((f, i) => ({
        product_id: productId,
        name: f.name,
        storage_path: f.storage_path,
        size_bytes: f.size_bytes,
        sort_order: i,
      }))
    );
    if (filesError) return { error: filesError.message };
  }

  revalidatePath("/dashboard/products");
  return { id: productId };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: product } = await supabase
    .from("products")
    .select("sales_count")
    .eq("id", productId)
    .eq("producer_id", user.id)
    .single();

  if (!product) return { error: "Produto não encontrado." };
  if (product.sales_count > 0) {
    return { error: "Produtos com vendas não podem ser apagados — pause-o em vez disso." };
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/products");
  return {};
}

export async function toggleProductStatus(productId: string, status: "approved" | "paused"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", productId)
    .eq("producer_id", user.id)
    .in("status", ["approved", "paused"]);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/products");
  return {};
}

export async function redirectToProduct(id: string) {
  redirect(`/dashboard/products/${id}`);
}
