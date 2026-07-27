import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/debito-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditOrder, notifyProducerOfFailedPayment } from "@/lib/order-fulfillment";
import { completeProductionUnlock } from "@/lib/production-unlock-fulfillment";

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

  const supabase = createAdminClient();

  // Temporary diagnostic: capture every header + the raw body so we can see
  // exactly what Debito Pay sends, regardless of whether verification below
  // passes. Safe to remove once the header name / signing scheme is confirmed.
  await supabase.from("logs").insert({
    action: "webhook_debug",
    target_table: "payments",
    metadata: {
      headers: Object.fromEntries(request.headers.entries()),
      rawBody,
    },
  });

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WebhookBody;
  const paymentId = body.data?.payment_id;
  if (!paymentId) return NextResponse.json({ error: "Missing payment_id" }, { status: 400 });

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

  if (!payment) {
    if (body.event === "payment.completed") {
      const { data: unlock } = await supabase
        .from("production_unlocks")
        .select("id")
        .eq("provider_payment_id", paymentId)
        .single();
      if (unlock) {
        const result = await completeProductionUnlock(unlock.id, {});
        if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
        return NextResponse.json({ ok: true, production_unlock: unlock.id });
      }
    }
    return NextResponse.json({ ok: true, note: "no matching payment" });
  }

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
    await creditOrder(order.id);
  }

  if (body.event === "payment.failed") {
    await notifyProducerOfFailedPayment(order.id);
  }

  return NextResponse.json({ ok: true });
}
