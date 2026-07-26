"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/debito-pay";
import { getActivePaymentProvider, providerModule, methodsForProvider } from "@/lib/payments";
import { creditOrder } from "@/lib/order-fulfillment";
import type { Product } from "@/types/database";

export interface CouponPreview {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountAmount: number;
}

export async function validateCoupon(
  productId: string,
  code: string
): Promise<{ error?: string; coupon?: CouponPreview }> {
  const supabase = createAdminClient();
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!product) return { error: "Produto não encontrado." };

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("producer_id", product.producer_id)
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .single();

  if (!coupon) return { error: "Cupão inválido." };
  if (coupon.product_id && coupon.product_id !== productId) {
    return { error: "Este cupão não é válido para este produto." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { error: "Este cupão expirou." };
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { error: "Este cupão atingiu o limite de utilizações." };
  }

  const base = product.promo_price ?? product.price;
  const discountAmount =
    coupon.discount_type === "percent"
      ? Math.round(base * (coupon.discount_value / 100) * 100) / 100
      : Math.min(coupon.discount_value, base);

  return {
    coupon: {
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount,
    },
  };
}

interface CreateOrderInput {
  productSlug: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  bumpProductIds?: string[];
  affiliateCode?: string;
  returnUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const supabase = createAdminClient();

  const authClient = await createClient();
  const {
    data: { user: buyer },
  } = await authClient.auth.getUser();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", input.productSlug)
    .eq("status", "approved")
    .single<Product>();

  if (!product) return { error: "Produto não encontrado ou indisponível." };

  const providerName = await getActivePaymentProvider();
  if (!methodsForProvider(providerName, product.currency).includes(input.paymentMethod)) {
    return { error: "Método de pagamento indisponível." };
  }

  const baseAmount = product.promo_price ?? product.price;

  let discountAmount = 0;
  let couponId: string | null = null;
  if (input.couponCode) {
    const result = await validateCoupon(product.id, input.couponCode);
    if (result.error) return { error: result.error };
    discountAmount = result.coupon!.discountAmount;
    const { data: couponRow } = await supabase
      .from("coupons")
      .select("id")
      .eq("producer_id", product.producer_id)
      .eq("code", input.couponCode.toUpperCase())
      .single();
    couponId = couponRow?.id ?? null;
  }

  let bumpTotal = 0;
  let bumps: { id: string; price: number }[] = [];
  if (input.bumpProductIds?.length) {
    const { data: bumpProducts } = await supabase
      .from("products")
      .select("*")
      .in("id", input.bumpProductIds)
      .eq("producer_id", product.producer_id)
      .eq("status", "approved");
    bumps = (bumpProducts ?? []).map((p) => ({ id: p.id, price: p.promo_price ?? p.price }));
    bumpTotal = bumps.reduce((sum, b) => sum + b.price, 0);
  }

  let affiliateId: string | null = null;
  let affiliateCommissionAmount = 0;
  if (input.affiliateCode && product.affiliate_enabled) {
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("*")
      .eq("product_id", product.id)
      .eq("code", input.affiliateCode)
      .single();
    if (affiliate) {
      affiliateId = affiliate.id;
      affiliateCommissionAmount =
        Math.round(baseAmount * (affiliate.commission_percent / 100) * 100) / 100;
    }
  }

  const totalAmount = Math.max(0, baseAmount - discountAmount) + bumpTotal;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: product.id,
      producer_id: product.producer_id,
      buyer_id: buyer?.id ?? null,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone ?? null,
      amount: baseAmount,
      discount_amount: discountAmount,
      coupon_id: couponId,
      total_amount: totalAmount,
      currency: product.currency,
      status: "pending",
      affiliate_id: affiliateId,
      affiliate_commission_amount: affiliateCommissionAmount,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      utm_content: input.utmContent ?? null,
      utm_term: input.utmTerm ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "Falha ao criar o pedido." };

  if (bumps.length > 0) {
    await supabase.from("order_bumps").insert(
      bumps.map((b) => ({ order_id: order.id, bump_product_id: b.id, price: b.price }))
    );
  }

  let charge;
  try {
    charge = await providerModule(providerName).createCharge({
      paymentMethod: input.paymentMethod,
      amount: totalAmount,
      currency: product.currency as "MZN" | "ZAR",
      sourceId: order.id,
      customerName: input.buyerName,
      customerEmail: input.buyerEmail,
      customerPhone: input.buyerPhone,
      returnUrl: input.returnUrl,
    });
  } catch (err) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { error: (err as Error).message };
  }

  // orders/payments.status is the order_status enum (pending/paid/failed/
  // refunded/expired) — providers report "success", not "paid".
  const paymentStatus = charge.status === "success" ? "paid" : (charge.status ?? "pending");

  await supabase.from("orders").update({ payment_method: input.paymentMethod }).eq("id", order.id);
  await supabase.from("payments").insert({
    order_id: order.id,
    provider: providerName,
    provider_payment_id: charge.payment_id,
    reference: charge.reference,
    checkout_url: charge.checkout_url,
    status: paymentStatus,
    raw_response: charge,
  });

  if (charge.status === "success") {
    await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
    await creditOrder(order.id);
  }

  if (couponId) {
    await supabase.rpc("increment_coupon_usage", { coupon_id: couponId }).then(
      () => {},
      () => {
        // Fallback if the RPC doesn't exist — best-effort, non-blocking.
      }
    );
  }

  return {
    orderId: order.id as string,
    status: charge.status,
    checkoutUrl: charge.checkout_url ?? null,
  };
}

export async function getOrderStatus(orderId: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado." };

  if (order.status === "pending") {
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (payment?.provider_payment_id) {
      try {
        const providerName = payment.provider === "zumbopay" ? "zumbopay" : "debito_pay";
        const remote = await providerModule(providerName).checkChargeStatus(payment.provider_payment_id);
        // remote.status is the provider's vocabulary ("success"/"pending"/
        // "failed"/"expired") — orders.status is the order_status enum,
        // which uses "paid" instead of "success".
        const mappedStatus = remote.status === "success" ? "paid" : remote.status;
        if (mappedStatus !== order.status) {
          await supabase.from("orders").update({ status: mappedStatus }).eq("id", orderId);
          if (mappedStatus === "paid" && !order.credited_at) {
            await supabase.from("orders").update({ paid_at: new Date().toISOString() }).eq("id", orderId);
            await creditOrder(orderId);
          }
          return { status: mappedStatus };
        }
      } catch {
        // best-effort reconciliation; webhook remains the source of truth
      }
    }
  }

  return { status: order.status };
}
