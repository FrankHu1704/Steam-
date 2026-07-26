"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/auth";

export async function submitReview(orderId: string, rating: number, comment: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Classificação inválida." };

  const { data: order } = await supabase.from("orders").select("id, product_id, buyer_id, status").eq("id", orderId).single();
  if (!order || order.buyer_id !== user.id) return { error: "Pedido não encontrado." };
  if (order.status !== "paid") return { error: "Só pode avaliar compras confirmadas." };

  const { error } = await supabase.from("reviews").insert({
    product_id: order.product_id,
    buyer_id: user.id,
    order_id: order.id,
    rating,
    comment: comment.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já avaliou esta compra." };
    return { error: error.message };
  }

  revalidatePath("/account/products");
  return {};
}
