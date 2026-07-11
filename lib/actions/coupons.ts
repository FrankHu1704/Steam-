"use server";

import { createClient } from "@/lib/supabase/server";
import type { CouponDiscountType } from "@/types/database";

export interface CreateCouponInput {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  productId?: string | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export async function createCoupon(input: CreateCouponInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };

  if (!input.code.trim()) return { error: "Indique um código." };
  if (input.discountValue <= 0) return { error: "O valor do desconto deve ser positivo." };

  const { error } = await supabase.from("coupons").insert({
    producer_id: user.id,
    code: input.code.trim().toUpperCase(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    product_id: input.productId || null,
    max_uses: input.maxUses || null,
    expires_at: input.expiresAt || null,
    active: true,
  });

  if (error) return { error: error.code === "23505" ? "Já existe um cupão com este código." : error.message };
  return { ok: true };
}

export async function toggleCouponActive(couponId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update({ active }).eq("id", couponId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteCoupon(couponId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) return { error: error.message };
  return { ok: true };
}
