"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/auth";

// The access token is never round-tripped back to the client after saving —
// the form only ever gets a boolean ("is one configured?"), never the value
// itself. RLS on product_capi_configs (owner-only, see migration 0049)
// backs this up at the DB level too.
export async function hasFacebookCapiToken(productId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("product_capi_configs").select("product_id").eq("product_id", productId).maybeSingle();
  return !!data;
}

export async function saveFacebookCapiToken(productId: string, token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!token.trim()) return { error: "Indique o token de acesso." };

  const { data: product } = await supabase.from("products").select("id, facebook_pixel_id").eq("id", productId).eq("producer_id", user.id).single();
  if (!product) return { error: "Produto não encontrado." };
  if (!product.facebook_pixel_id) {
    return { error: "Preencha primeiro o Facebook Pixel (ID) acima — o token é usado junto com ele." };
  }

  const { error } = await supabase
    .from("product_capi_configs")
    .upsert({ product_id: productId, fb_access_token: token.trim(), updated_at: new Date().toISOString() });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/products/${productId}`);
  return {};
}

export async function removeFacebookCapiToken(productId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("product_capi_configs").delete().eq("product_id", productId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/products/${productId}`);
  return {};
}
