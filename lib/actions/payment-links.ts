"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { generateCheckoutCopyWithGroq } from "@/lib/groq";
import { isValidAccentColorKey, MAX_HIGHLIGHT_TEXT_LENGTH } from "@/lib/checkout-theme";
import type { ActionResult } from "@/lib/actions/auth";
import type { UploadedFile } from "@/lib/upload";
import type { CheckoutCopyResult } from "@/lib/groq";

const MINIMUM_PRICE = 50;

interface UpsertPaymentLinkInput {
  id?: string;
  title: string;
  description: string;
  price: number;
  currency: "MZN" | "ZAR";
  coverImageUrl: string | null;
  file: UploadedFile | null;
  accentColor: string | null;
  highlightText: string | null;
}

// A lighter alternative to upsertProduct() for producers who just want a
// quick payment link (no category, no marketplace listing, one attachment)
// instead of the full "Criar Produto" wizard — same underlying products/
// product_files tables and the same moderation queue, just flagged
// is_payment_link=true and always kept off the marketplace.
export async function upsertPaymentLink(input: UpsertPaymentLinkInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const title = input.title.trim();
  if (!title) return { error: "A descrição é obrigatória." };
  if (!(input.price >= MINIMUM_PRICE)) return { error: `O valor deve ser de pelo menos ${MINIMUM_PRICE} MT.` };
  if (!input.file) return { error: "Anexe um ficheiro ou link — é obrigatório." };
  if (!input.coverImageUrl) return { error: "A imagem de capa é obrigatória." };

  // Accent color is only ever one of a fixed palette (lib/checkout-theme.ts)
  // — anything else is silently dropped rather than stored, since this
  // value ends up rendered on a real payment page.
  const accentColor = input.accentColor && isValidAccentColorKey(input.accentColor) ? input.accentColor : null;
  const highlightText = input.highlightText?.trim().slice(0, MAX_HIGHLIGHT_TEXT_LENGTH) || null;

  const payload = {
    producer_id: user.id,
    category_id: null,
    title,
    description: input.description.trim() || title,
    price: input.price,
    promo_price: null,
    currency: input.currency,
    cover_image_url: input.coverImageUrl,
    show_in_marketplace: false,
    is_payment_link: true,
    checkout_accent_color: accentColor,
    checkout_highlight_text: highlightText,
  };

  let productId = input.id;

  if (productId) {
    const { error } = await supabase
      .from("products")
      .update({ ...payload, status: "pending" })
      .eq("id", productId)
      .eq("producer_id", user.id)
      .eq("is_payment_link", true);
    if (error) return { error: error.message };
  } else {
    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, slug, status: "pending" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    productId = data!.id as string;
  }

  if (input.file) {
    await supabase.from("product_files").delete().eq("product_id", productId);
    const { error: fileError } = await supabase.from("product_files").insert({
      product_id: productId,
      name: input.file.name,
      storage_path: input.file.storage_path,
      external_url: input.file.external_url,
      size_bytes: input.file.size_bytes,
      sort_order: 0,
    });
    if (fileError) return { error: fileError.message };
  }

  revalidatePath("/dashboard/products");
  return { id: productId };
}

// Producer describes what they're selling in their own words; LunaAI turns
// it into checkout copy they can review/edit before saving — never applied
// automatically.
export async function generatePaymentLinkCopy(
  rawDescription: string
): Promise<{ result?: CheckoutCopyResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!rawDescription.trim()) return { error: "Descreva o que está a vender." };

  return generateCheckoutCopyWithGroq(rawDescription.trim());
}
