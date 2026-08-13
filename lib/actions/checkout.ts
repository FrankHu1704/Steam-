"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/debito-pay";
import {
  getActivePaymentProvider,
  resolveChargeProvider,
  chargeProviderModule,
  methodsForProvider,
  type ChargeProviderName,
} from "@/lib/payments";
import { creditOrder, notifyProducerOfFailedPayment } from "@/lib/order-fulfillment";
import type { Product } from "@/types/database";

// Only NetShop's charge response is confirmed to include this (its own
// processing commission, e.g. "fee": 18.7 on a 187 MZN charge — verified
// from a real response, not assumed). Other providers may or may not
// return an equivalent field; until that's checked, this just quietly
// captures nothing for them rather than guessing at a field name. See
// getPlatformRevenue() (lib/data/admin.ts) for why this matters: without
// it, "Lucro líquido" never accounts for what the processor itself takes
// out of each sale, on top of our own platform fee.
async function recordProcessorFee(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  charge: unknown
): Promise<void> {
  const fee = (charge as { processorFee?: unknown })?.processorFee;
  if (typeof fee !== "number") return;
  await supabase.from("orders").update({ processor_fee_amount: fee }).eq("id", orderId);
}

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
  // Post-purchase upsell: overrides the product's own price and tags the
  // resulting order as originating from the order it upsold from.
  customPrice?: number;
  upsellOfOrderId?: string;
  // Which wallet this sale credits: "marketplace" (default, the hosted
  // PayNow checkout) or "api" (charged through the developer/Pagar API by
  // the producer's own external app) — see lib/order-fulfillment.ts.
  source?: "marketplace" | "api";
  // Facebook's own first-party cookies, read client-side from document.cookie
  // by the checkout form — feed Meta's event-matching for the server-side
  // Purchase event fired from creditOrder() (lib/facebook-capi.ts). Neither
  // is set if the buyer has no Facebook Pixel history (ad blocker, first
  // visit without the base script yet, etc) — both are optional everywhere.
  fbp?: string;
  fbc?: string;
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

  const activeProviderName = await getActivePaymentProvider();
  if (!(await methodsForProvider(activeProviderName, product.currency)).includes(input.paymentMethod)) {
    return { error: "Método de pagamento indisponível." };
  }
  const providerName = await resolveChargeProvider(input.paymentMethod, product.currency);

  const baseAmount = input.customPrice ?? product.promo_price ?? product.price;

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

  // Best-effort — used only to help the Facebook Conversions API
  // (lib/facebook-capi.ts) match this order's later Purchase event to the
  // buyer; never required for the charge/order itself.
  const requestHeaders = await headers();
  const clientIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const clientUserAgent = requestHeaders.get("user-agent");

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
      payment_method: input.paymentMethod,
      affiliate_id: affiliateId,
      affiliate_commission_amount: affiliateCommissionAmount,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      utm_content: input.utmContent ?? null,
      utm_term: input.utmTerm ?? null,
      upsell_of_order_id: input.upsellOfOrderId ?? null,
      source: input.source ?? "marketplace",
      client_ip: clientIp,
      client_user_agent: clientUserAgent,
      fbp: input.fbp ?? null,
      fbc: input.fbc ?? null,
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
    charge = await chargeProviderModule(providerName).createCharge({
      paymentMethod: input.paymentMethod,
      amount: totalAmount,
      currency: product.currency as "MZN" | "ZAR",
      sourceId: order.id,
      customerName: input.buyerName,
      customerEmail: input.buyerEmail,
      customerPhone: input.buyerPhone,
      returnUrl: input.returnUrl,
      title: product.title,
    });
  } catch (err) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    await supabase.from("logs").insert({
      action: "checkout_charge_error",
      target_table: "orders",
      target_id: order.id,
      metadata: { error: (err as Error).message, provider: providerName, method: input.paymentMethod },
    });
    await notifyProducerOfFailedPayment(order.id);
    return { error: (err as Error).message };
  }

  // orders/payments.status is the order_status enum (pending/paid/failed/
  // refunded/expired) — providers report "success", not "paid".
  const paymentStatus = charge.status === "success" ? "paid" : (charge.status ?? "pending");

  await supabase.from("payments").insert({
    order_id: order.id,
    provider: providerName,
    provider_payment_id: charge.payment_id,
    reference: charge.reference,
    checkout_url: charge.checkout_url,
    status: paymentStatus,
    raw_response: charge,
  });
  await recordProcessorFee(supabase, order.id, charge);

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

interface CreateManualOrderInput {
  producerId: string;
  amount: number;
  currency: "MZN" | "ZAR";
  description?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  paymentMethod: PaymentMethod;
  returnUrl?: string;
}

// Used only by the developer API when a charge is created without a
// product_id (an "amount" is given instead) — no product record backs
// this order, so there's no digital delivery, order bump, or affiliate
// commission; it's a plain charge for an arbitrary amount, same as most
// external payment-gateway APIs work.
export async function createManualOrder(input: CreateManualOrderInput) {
  const supabase = createAdminClient();

  const activeProviderName = await getActivePaymentProvider();
  if (!(await methodsForProvider(activeProviderName, input.currency)).includes(input.paymentMethod)) {
    return { error: "Método de pagamento indisponível." };
  }
  const providerName = await resolveChargeProvider(input.paymentMethod, input.currency);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: null,
      producer_id: input.producerId,
      buyer_id: null,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone ?? null,
      amount: input.amount,
      discount_amount: 0,
      coupon_id: null,
      total_amount: input.amount,
      currency: input.currency,
      status: "pending",
      payment_method: input.paymentMethod,
      affiliate_id: null,
      affiliate_commission_amount: 0,
      description: input.description ?? null,
      source: "api",
    })
    .select("id")
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "Falha ao criar o pedido." };

  let charge;
  try {
    charge = await chargeProviderModule(providerName).createCharge({
      paymentMethod: input.paymentMethod,
      amount: input.amount,
      currency: input.currency,
      sourceId: order.id,
      customerName: input.buyerName,
      customerEmail: input.buyerEmail,
      customerPhone: input.buyerPhone,
      returnUrl: input.returnUrl,
      title: input.description,
    });
  } catch (err) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    await notifyProducerOfFailedPayment(order.id);
    return { error: (err as Error).message };
  }

  const paymentStatus = charge.status === "success" ? "paid" : (charge.status ?? "pending");

  await supabase.from("payments").insert({
    order_id: order.id,
    provider: providerName,
    provider_payment_id: charge.payment_id,
    reference: charge.reference,
    checkout_url: charge.checkout_url,
    status: paymentStatus,
    raw_response: charge,
  });
  await recordProcessorFee(supabase, order.id, charge);

  if (charge.status === "success") {
    await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
    await creditOrder(order.id);
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
        const providerName: ChargeProviderName =
          payment.provider === "zumbopay" ||
          payment.provider === "netshop" ||
          payment.provider === "pagar" ||
          payment.provider === "paysuite"
            ? payment.provider
            : "debito_pay";
        const remote = await chargeProviderModule(providerName).checkChargeStatus(
          payment.provider_payment_id,
          order.payment_method as PaymentMethod
        );
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
          if (mappedStatus === "failed") {
            await notifyProducerOfFailedPayment(orderId);
          }
          return { status: mappedStatus };
        }
      } catch (err) {
        // best-effort reconciliation; webhook remains the source of truth —
        // but log it so a persistent provider-side issue is still visible
        // in Admin → Logs instead of failing completely silently.
        await supabase.from("logs").insert({
          action: "order_status_check_error",
          target_table: "orders",
          target_id: orderId,
          metadata: { error: (err as Error).message },
        });
      }
    }

    // Safety net: STK push confirmations (M-Pesa/e-Mola) normally resolve in
    // seconds. If an order is still "pending" after several minutes — e.g.
    // the provider reported a status string we don't recognise as a
    // failure — stop leaving the buyer stuck on "a processar" forever.
    const PENDING_TIMEOUT_MS = 5 * 60 * 1000;
    if (Date.now() - new Date(order.created_at).getTime() > PENDING_TIMEOUT_MS) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);
      await notifyProducerOfFailedPayment(orderId);
      return { status: "failed" };
    }
  }

  return { status: order.status };
}

export interface UpsellOfferPreview {
  productId: string;
  productSlug: string;
  title: string;
  coverImageUrl: string | null;
  price: number;
  currency: string;
}

// Shown on the order confirmation page right after a payment succeeds —
// null if the purchased product has no upsell configured, or if this order
// is itself the result of accepting one (never chain upsell offers).
export async function getUpsellOfferForOrder(orderId: string): Promise<UpsellOfferPreview | null> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("product_id, status, upsell_of_order_id")
    .eq("id", orderId)
    .single();
  if (!order || order.status !== "paid" || order.upsell_of_order_id) return null;

  const { data: upsell } = await supabase
    .from("product_upsells")
    .select("upsell_product_id, custom_price")
    .eq("product_id", order.product_id)
    .maybeSingle();
  if (!upsell) return null;

  const { data: upsellProduct } = await supabase
    .from("products")
    .select("slug, title, cover_image_url, price, promo_price, currency, status")
    .eq("id", upsell.upsell_product_id)
    .single();
  if (!upsellProduct || upsellProduct.status !== "approved") return null;

  return {
    productId: upsell.upsell_product_id as string,
    productSlug: upsellProduct.slug,
    title: upsellProduct.title,
    coverImageUrl: upsellProduct.cover_image_url,
    price: upsell.custom_price ?? upsellProduct.promo_price ?? upsellProduct.price,
    currency: upsellProduct.currency,
  };
}

// The buyer clicks one button — we replay their name/email/phone/payment
// method from the order they just paid, so no re-typing is needed. Mobile
// money still needs a fresh STK-push approval on the buyer's phone; that
// part of the flow can't be skipped, only the form-filling can.
export async function acceptUpsellOffer(orderId: string, upsellProductId: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.status !== "paid") return { error: "Pedido original não encontrado ou não confirmado." };

  const { data: upsell } = await supabase
    .from("product_upsells")
    .select("upsell_product_id, custom_price")
    .eq("product_id", order.product_id)
    .eq("upsell_product_id", upsellProductId)
    .maybeSingle();
  if (!upsell) return { error: "Esta oferta já não está disponível." };

  const { data: upsellProduct } = await supabase
    .from("products")
    .select("slug, status")
    .eq("id", upsellProductId)
    .single();
  if (!upsellProduct || upsellProduct.status !== "approved") return { error: "Produto indisponível." };

  return createOrder({
    productSlug: upsellProduct.slug,
    buyerName: order.buyer_name,
    buyerEmail: order.buyer_email,
    buyerPhone: order.buyer_phone ?? undefined,
    paymentMethod: order.payment_method as PaymentMethod,
    customPrice: upsell.custom_price ?? undefined,
    upsellOfOrderId: order.id,
  });
}
