"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function becomeAffiliate(productId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };

  const supabase = createAdminClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, producer_id, affiliate_enabled, affiliate_commission_percent, status")
    .eq("id", productId)
    .single();
  if (!product || product.status !== "approved" || !product.affiliate_enabled) {
    return { error: "Este produto não aceita afiliados." };
  }
  if (product.producer_id === user.id) {
    return { error: "Não pode ser afiliado do seu próprio produto." };
  }

  const { data: existing } = await supabase
    .from("affiliates")
    .select("id, code")
    .eq("product_id", productId)
    .eq("affiliate_id", user.id)
    .maybeSingle();
  if (existing) return { code: existing.code };

  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase.from("affiliates").select("id").eq("code", code).maybeSingle();
    if (!clash) break;
    code = generateCode();
  }

  const { data: inserted, error } = await supabase
    .from("affiliates")
    .insert({
      product_id: productId,
      affiliate_id: user.id,
      code,
      commission_percent: product.affiliate_commission_percent,
    })
    .select("code")
    .single();

  if (error || !inserted) return { error: error?.message ?? "Falha ao gerar o link de afiliado." };
  return { code: inserted.code };
}
