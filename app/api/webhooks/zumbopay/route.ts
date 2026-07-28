import { NextResponse } from "next/server";
import { verifyWebhookSignature, getAuthoritativeStatus } from "@/lib/zumbopay";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditOrder, notifyProducerOfFailedPayment } from "@/lib/order-fulfillment";
import { completeProductionUnlock } from "@/lib/production-unlock-fulfillment";

interface WebhookBody {
  event?: string;
  type?: string;
  id?: string;
  event_id?: string;
  data?: {
    reference?: string;
    payment_reference?: string;
    source_id?: string;
    status?: string;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const timestamp = request.headers.get("x-timestamp");

  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WebhookBody;
  const data = body.data ?? {};
  const reference = data.reference ?? data.payment_reference;
  const sourceId = data.source_id;
  const eventName = (body.event ?? body.type ?? "").toLowerCase();
  const eventId = body.id ?? body.event_id ?? `${eventName}:${reference}`;

  if (!reference || !sourceId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existingEvent } = await supabase
    .from("logs")
    .select("id")
    .eq("action", "zumbopay_webhook")
    .eq("target_id", eventId)
    .maybeSingle();
  if (existingEvent) return NextResponse.json({ ok: true, duplicate: true });

  await supabase
    .from("logs")
    .insert({ action: "zumbopay_webhook", target_table: "orders", target_id: eventId, metadata: body });

  // sourceId is our order.id (or a production_unlocks.id for the
  // "unlock production API mode" one-time charge) — set when we created
  // the charge/payment.
  const { data: order } = await supabase.from("orders").select("*").eq("id", sourceId).single();

  if (!order) {
    const authoritative = await getAuthoritativeStatus(reference);
    if (authoritative.status !== "success") return NextResponse.json({ ok: true, pending: true });
    const result = await completeProductionUnlock(sourceId, authoritative);
    if (!result.handled) return NextResponse.json({ ok: true, note: "no matching order or unlock" });
    if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, production_unlock: sourceId });
  }

  if (order.status === "paid") return NextResponse.json({ ok: true, already_paid: true });

  // Server-to-server re-verification — never trust the webhook body alone.
  let authoritative;
  try {
    authoritative = await getAuthoritativeStatus(reference);
  } catch (err) {
    await supabase.from("logs").insert({
      action: "zumbopay_status_check_error",
      target_table: "orders",
      target_id: order.id,
      metadata: { error: (err as Error).message, reference },
    });
    return NextResponse.json({ ok: false, error: "status_check_failed" }, { status: 502 });
  }

  if (authoritative.status === "failed") {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    await notifyProducerOfFailedPayment(order.id);
    return NextResponse.json({ ok: true, status: "failed" });
  }
  if (authoritative.status !== "success") {
    return NextResponse.json({ ok: true, pending: true });
  }
  if (authoritative.amount != null && Math.abs(authoritative.amount - order.total_amount) > 0.01) {
    return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 409 });
  }
  if (authoritative.currency && authoritative.currency !== order.currency) {
    return NextResponse.json({ ok: false, error: "currency_mismatch" }, { status: 409 });
  }

  await supabase
    .from("payments")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("order_id", order.id);
  await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);

  if (!order.credited_at) {
    await creditOrder(order.id);
  }

  return NextResponse.json({ ok: true, order_id: order.id });
}
