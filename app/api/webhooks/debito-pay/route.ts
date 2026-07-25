import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/debito-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSaleNotificationEmail } from "@/lib/email";
import { sendSaleSms } from "@/lib/sms";

interface WebhookBody {
  event: "payment.completed" | "payment.failed" | "payment.refunded" | "payment.chargeback";
  data: {
    payment_id: string;
    amount: number;
    currency: string;
    reference: string;
  };
  timestamp: string;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WebhookBody;
  const paymentId = body.data?.payment_id;
  if (!paymentId) return NextResponse.json({ error: "Missing payment_id" }, { status: 400 });

  const supabase = createAdminClient();
  const eventId = `${paymentId}:${body.event}:${body.timestamp}`;

  const { data: existingEvent } = await supabase
    .from("logs")
    .select("id")
    .eq("action", "webhook")
    .eq("target_id", eventId)
    .maybeSingle();
  if (existingEvent) return NextResponse.json({ ok: true, duplicate: true });

  await supabase
    .from("logs")
    .insert({ action: "webhook", target_table: "payments", target_id: eventId, metadata: body });

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("provider_payment_id", paymentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!payment) return NextResponse.json({ ok: true, note: "no matching payment" });

  const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
  if (!order) return NextResponse.json({ ok: true, note: "no matching order" });

  const statusMap: Record<string, string> = {
    "payment.completed": "paid",
    "payment.failed": "failed",
    "payment.refunded": "refunded",
    "payment.chargeback": "refunded",
  };
  const newStatus = statusMap[body.event] ?? "pending";

  await supabase.from("payments").update({ status: newStatus, updated_at: new Date().toISOString() }).eq(
    "id",
    payment.id
  );
  await supabase
    .from("orders")
    .update({ status: newStatus, paid_at: body.event === "payment.completed" ? new Date().toISOString() : order.paid_at })
    .eq("id", order.id);

  if (body.event === "payment.completed" && !order.credited_at) {
    const { data: platformFeeSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "platform_fee_percent")
      .single();
    const platformFeePercent = Number(platformFeeSetting?.value ?? 0);

    const commission = order.affiliate_commission_amount ?? 0;
    const ownerNet = (order.total_amount - commission) * (1 - platformFeePercent / 100);

    const { data: producer } = await supabase
      .from("profiles")
      .select("balance_available, email, phone")
      .eq("id", order.producer_id)
      .single();
    await supabase
      .from("profiles")
      .update({ balance_available: (producer?.balance_available ?? 0) + ownerNet })
      .eq("id", order.producer_id);

    const { data: product } = await supabase.from("products").select("title").eq("id", order.product_id).single();

    await supabase.rpc("increment_product_sales", { p_id: order.product_id });

    if (order.affiliate_id && commission > 0) {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("*")
        .eq("id", order.affiliate_id)
        .single();
      if (affiliate) {
        const { data: affiliateProfile } = await supabase
          .from("profiles")
          .select("balance_available")
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
      }
    }

    // Grant downloads for every file on the purchased product (and any
    // order-bump products), each with its own signed-access token.
    const { data: bumpRows } = await supabase.from("order_bumps").select("bump_product_id").eq("order_id", order.id);
    const productIds = [order.product_id, ...(bumpRows ?? []).map((b) => b.bump_product_id)];
    const { data: files } = await supabase.from("product_files").select("*").in("product_id", productIds);
    if (files?.length) {
      await supabase
        .from("downloads")
        .insert(files.map((f) => ({ order_id: order.id, product_file_id: f.id })));
    }

    await supabase.from("notifications").insert({
      user_id: order.producer_id,
      type: "sale",
      title: "Nova venda!",
      message: `Você vendeu por ${order.total_amount} ${order.currency}.`,
    });

    if (producer?.email) {
      await sendSaleNotificationEmail({
        producerEmail: producer.email,
        productTitle: product?.title ?? "o seu produto",
        amount: order.total_amount,
        currency: order.currency,
      });
    }

    if (producer?.phone) {
      await sendSaleSms({
        phone: producer.phone,
        productTitle: product?.title ?? "o seu produto",
        amount: order.total_amount,
        currency: order.currency,
      });
    }

    await supabase.from("orders").update({ credited_at: new Date().toISOString() }).eq("id", order.id);
  }

  return NextResponse.json({ ok: true });
}
