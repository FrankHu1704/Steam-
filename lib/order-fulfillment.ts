import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendSaleNotificationEmail,
  sendBuyerReceiptEmail,
  sendPaymentFailedEmail,
  sendRefundNotificationEmail,
  siteUrl,
} from "@/lib/email";
import { sendPaymentConfirmedSms, sendPurchaseConfirmedSms } from "@/lib/easyhost-sms";
import { sendBuyerWhatsappReceipt } from "@/lib/whatsapp";
import { dispatchPaymentCompletedWebhook } from "@/lib/developer-webhooks";
import { sendPushToUser } from "@/lib/push";

// Shared by the Debito Pay webhook and the admin "mark as paid" fallback —
// whichever one gets there first does the crediting; the `credited_at`
// guard makes this safe to call more than once for the same order.
export async function creditOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.credited_at) return;

  const { data: feeSettings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["platform_fee_percent", "platform_fixed_fee_amount"]);
  const platformFeePercent = Number(feeSettings?.find((s) => s.key === "platform_fee_percent")?.value ?? 10);
  const platformFixedFeeAmount = Number(feeSettings?.find((s) => s.key === "platform_fixed_fee_amount")?.value ?? 0);

  const commission = order.affiliate_commission_amount ?? 0;
  const percentFee = (order.total_amount - commission) * (platformFeePercent / 100);
  const platformFeeAmount = Math.round((percentFee + platformFixedFeeAmount) * 100) / 100;
  const ownerNet = Math.max(0, order.total_amount - commission - platformFeeAmount);

  const { data: producer } = await supabase
    .from("profiles")
    .select(
      "name, balance_available, balance_available_dev, email, phone, recruited_by_employee_id, created_at, lifetime_sales_count"
    )
    .eq("id", order.producer_id)
    .single();
  // "api" orders come from a producer's own external app charging through
  // the developer API (Pagar API) — kept in a separate wallet from regular
  // marketplace product sales so the two revenue streams never mix.
  const walletField = order.source === "api" ? "balance_available_dev" : "balance_available";
  await supabase
    .from("profiles")
    .update({
      [walletField]: (producer?.[walletField] ?? 0) + ownerNet,
      lifetime_sales_count: (producer?.lifetime_sales_count ?? 0) + 1,
    })
    .eq("id", order.producer_id);

  // Employee/collaborator recruiter commission — 5% of the sale for the
  // first 3 months after the producer signed up via their link, capped at
  // what PagaJá actually earned as its own platform fee on this order so
  // this can never push the platform's own take on the sale negative.
  if (producer?.recruited_by_employee_id) {
    const recruitedUntil = new Date(producer.created_at);
    recruitedUntil.setMonth(recruitedUntil.getMonth() + 3);
    if (new Date() <= recruitedUntil) {
      const { data: employee } = await supabase
        .from("employees")
        .select("id, commission_percent, balance_available, active")
        .eq("id", producer.recruited_by_employee_id)
        .single();
      if (employee?.active) {
        const rawCommission = Math.round(order.total_amount * (employee.commission_percent / 100) * 100) / 100;
        const employeeCommission = Math.min(rawCommission, platformFeeAmount);
        if (employeeCommission > 0) {
          await supabase
            .from("employees")
            .update({ balance_available: employee.balance_available + employeeCommission })
            .eq("id", employee.id);
          await supabase.from("employee_commissions").insert({
            employee_id: employee.id,
            order_id: order.id,
            producer_id: order.producer_id,
            amount: employeeCommission,
          });
        }
      }
    }
  }

  // "Manual" API charges (no product_id) have nothing to look up here —
  // order.description stands in for the product title in every message
  // below.
  const product = order.product_id
    ? (await supabase.from("products").select("title").eq("id", order.product_id).single()).data
    : null;
  const productLabel = product?.title ?? order.description ?? "o seu produto";

  if (order.product_id) {
    await supabase.rpc("increment_product_sales", { p_id: order.product_id });
  }

  if (order.affiliate_id && commission > 0) {
    const { data: affiliate } = await supabase.from("affiliates").select("*").eq("id", order.affiliate_id).single();
    if (affiliate) {
      const { data: affiliateProfile } = await supabase
        .from("profiles")
        .select("balance_available, recruited_by_producer_id, created_at")
        .eq("id", affiliate.affiliate_id)
        .single();
      await supabase
        .from("profiles")
        .update({ balance_available: (affiliateProfile?.balance_available ?? 0) + commission })
        .eq("id", affiliate.affiliate_id);
      await supabase
        .from("affiliates")
        .update({ sales: affiliate.sales + 1, commission_earned: affiliate.commission_earned + commission })
        .eq("id", affiliate.id);
      await supabase.from("commissions").insert({
        affiliate_row_id: affiliate.id,
        order_id: order.id,
        amount: commission,
        status: "pending",
      });

      // Producer/affiliate-recruiter reward — 3% of the sale for the first
      // month after this affiliate signed up via a producer's referral
      // link, capped at what PagaJá earned as its own platform fee on this
      // order (same safety cap as the employee recruiter commission above),
      // so it's always funded by the platform's own take, never by the
      // affiliate or the selling producer.
      if (affiliateProfile?.recruited_by_producer_id) {
        const recruitedUntil = new Date(affiliateProfile.created_at);
        recruitedUntil.setMonth(recruitedUntil.getMonth() + 1);
        if (new Date() <= recruitedUntil) {
          const rawReferralCommission = Math.round(order.total_amount * 0.03 * 100) / 100;
          const referralCommission = Math.min(rawReferralCommission, platformFeeAmount);
          if (referralCommission > 0) {
            const { data: recruitingProducer } = await supabase
              .from("profiles")
              .select("balance_available")
              .eq("id", affiliateProfile.recruited_by_producer_id)
              .single();
            await supabase
              .from("profiles")
              .update({ balance_available: (recruitingProducer?.balance_available ?? 0) + referralCommission })
              .eq("id", affiliateProfile.recruited_by_producer_id);
            await supabase.from("producer_affiliate_commissions").insert({
              producer_id: affiliateProfile.recruited_by_producer_id,
              affiliate_id: affiliate.affiliate_id,
              order_id: order.id,
              amount: referralCommission,
            });
          }
        }
      }
    }
  }

  // Grant downloads for every file on the purchased product (and any
  // order-bump products), each with its own signed-access token. Manual
  // API charges have no product_id at all, so there's nothing to grant.
  const { data: bumpRows } = await supabase.from("order_bumps").select("bump_product_id").eq("order_id", order.id);
  const productIds = [order.product_id, ...(bumpRows ?? []).map((b) => b.bump_product_id)].filter(
    (id): id is string => !!id
  );
  if (productIds.length > 0) {
    const { data: files } = await supabase.from("product_files").select("*").in("product_id", productIds);
    if (files?.length) {
      await supabase.from("downloads").insert(files.map((f) => ({ order_id: order.id, product_file_id: f.id })));
    }
  }

  await supabase.from("notifications").insert({
    user_id: order.producer_id,
    type: "sale",
    title: "Nova venda!",
    message: `Você vendeu por ${order.total_amount} ${order.currency}.`,
  });

  await sendPushToUser(order.producer_id, {
    title: "Nova venda! 🎉",
    body: `Vendeu ${productLabel} por ${order.total_amount} ${order.currency}.`,
    url: "/dashboard",
  });

  // Every sale on the platform also notifies every admin — not just the
  // producer — so the admin can keep track of all activity from one place.
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  for (const adminProfile of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: adminProfile.id,
      type: "sale",
      title: "Nova venda",
      message: `${producer?.name ?? "Um produtor"} vendeu ${productLabel} por ${order.total_amount} ${order.currency}.`,
    });
    await sendPushToUser(adminProfile.id, {
      title: "Nova venda 🎉",
      body: `${producer?.name ?? "Produtor"} vendeu ${productLabel} por ${order.total_amount} ${order.currency}.`,
      url: "/admin/orders",
    });
  }

  if (producer?.email) {
    await sendSaleNotificationEmail({
      producerEmail: producer.email,
      productTitle: productLabel,
      amount: order.total_amount,
      netAmount: ownerNet,
      currency: order.currency,
    });
  }

  if (producer?.phone) {
    await sendPaymentConfirmedSms({
      phone: producer.phone,
      productTitle: productLabel,
      amount: order.total_amount,
      currency: order.currency,
    });
  }

  const accessUrl = `${siteUrl()}/pedido/${order.id}`;

  if (order.buyer_email) {
    await sendBuyerReceiptEmail({
      buyerEmail: order.buyer_email,
      productTitle: productLabel,
      accessUrl,
      orderId: order.id,
      amount: order.total_amount,
      currency: order.currency as "MZN" | "ZAR",
      purchasedAt: order.paid_at ?? new Date().toISOString(),
      supportName: producer?.name,
      supportContact: producer?.phone,
    });
  }

  if (order.buyer_phone) {
    await sendBuyerWhatsappReceipt({
      phone: order.buyer_phone,
      productTitle: productLabel,
      accessUrl,
    });
    await sendPurchaseConfirmedSms({
      phone: order.buyer_phone,
      productTitle: productLabel,
      accessUrl,
    });
  }

  await dispatchPaymentCompletedWebhook(order, { id: order.product_id, title: productLabel });

  await supabase
    .from("orders")
    .update({ credited_at: new Date().toISOString(), platform_fee_amount: platformFeeAmount })
    .eq("id", order.id);
}

// Called whenever a paid order is refunded or charged back by the payment
// processor — claws back whatever creditOrder() paid out, so a producer's
// balance can't silently stay inflated by money PagaJá no longer actually
// holds. Idempotent via refunded_at, mirroring credited_at on creditOrder.
export async function refundOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.refunded_at) return;

  // Never credited in the first place (still pending/failed when the
  // refund arrived) — nothing to claw back, just record the final status.
  if (!order.credited_at) {
    await supabase
      .from("orders")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", order.id);
    return;
  }

  const commission = order.affiliate_commission_amount ?? 0;
  const platformFeeAmount = order.platform_fee_amount ?? 0;
  const ownerNet = Math.max(0, order.total_amount - commission - platformFeeAmount);

  const { data: producer } = await supabase
    .from("profiles")
    .select("balance_available, balance_available_dev, email, name, lifetime_sales_count")
    .eq("id", order.producer_id)
    .single();
  const walletField = order.source === "api" ? "balance_available_dev" : "balance_available";
  // Intentionally allowed to go negative — if the producer already withdrew
  // this money, the debt has to show up somewhere rather than being erased.
  const newBalance = (producer?.[walletField] ?? 0) - ownerNet;
  await supabase
    .from("profiles")
    .update({
      [walletField]: newBalance,
      lifetime_sales_count: Math.max(0, (producer?.lifetime_sales_count ?? 0) - 1),
    })
    .eq("id", order.producer_id);

  if (order.affiliate_id && commission > 0) {
    const { data: affiliate } = await supabase.from("affiliates").select("*").eq("id", order.affiliate_id).single();
    if (affiliate) {
      const { data: affiliateProfile } = await supabase
        .from("profiles")
        .select("balance_available")
        .eq("id", affiliate.affiliate_id)
        .single();
      await supabase
        .from("profiles")
        .update({ balance_available: (affiliateProfile?.balance_available ?? 0) - commission })
        .eq("id", affiliate.affiliate_id);
      await supabase
        .from("affiliates")
        .update({
          sales: Math.max(0, affiliate.sales - 1),
          commission_earned: Math.max(0, affiliate.commission_earned - commission),
        })
        .eq("id", affiliate.id);
    }
  }

  await supabase
    .from("orders")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", order.id);

  const product = order.product_id
    ? (await supabase.from("products").select("title").eq("id", order.product_id).single()).data
    : null;

  await supabase.from("notifications").insert({
    user_id: order.producer_id,
    type: "refund",
    title: "Venda reembolsada",
    message: `A venda de ${order.total_amount} ${order.currency} foi reembolsada/estornada.`,
  });

  if (producer?.email) {
    await sendRefundNotificationEmail({
      producerEmail: producer.email,
      producerName: producer.name,
      buyerName: order.buyer_name,
      productTitle: product?.title ?? order.description ?? "o seu produto",
      amount: order.total_amount,
      currency: order.currency,
      newBalance,
    });
  }
}

// Called wherever an order transitions to "failed" (instant charge-creation
// error, or a provider webhook reporting a failed payment) — best-effort,
// never throws, so it's always safe to call right after the status update.
export async function notifyProducerOfFailedPayment(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return;

  const [{ data: producer }, { data: product }] = await Promise.all([
    supabase.from("profiles").select("email, name").eq("id", order.producer_id).single(),
    supabase.from("products").select("title").eq("id", order.product_id).single(),
  ]);

  if (producer?.email) {
    await sendPaymentFailedEmail({
      producerEmail: producer.email,
      producerName: producer.name,
      buyerName: order.buyer_name,
      productTitle: product?.title ?? "o seu produto",
      amount: order.total_amount,
      currency: order.currency,
    });
  }
}
