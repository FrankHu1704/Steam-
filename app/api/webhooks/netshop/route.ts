import { NextResponse } from "next/server";
import { verifyWebhookSignature, getAuthoritativeStatus } from "@/lib/netshop";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditOrder, notifyProducerOfFailedPayment, refundOrder } from "@/lib/order-fulfillment";

interface WebhookBody {
  event?: string;
  type?: string;
  id?: string;
  data?: {
    id?: string;
    charge_id?: string;
    payout_id?: string;
    reference?: string;
    source_id?: string;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-netshop-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WebhookBody;
  const eventName = (body.event ?? body.type ?? "").toLowerCase();
  const data = body.data ?? {};
  // The exact webhook body shape isn't documented beyond the event names,
  // so this is intentionally defensive about where the charge/order id and
  // our own reference (order.id, sent as `reference` on POST /charges) live.
  const providerId = data.id ?? data.charge_id ?? data.payout_id ?? body.id;
  const orderId = data.reference ?? data.source_id ?? providerId;

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const eventId = `${eventName}:${providerId ?? orderId}`;

  const { data: existingEvent } = await supabase
    .from("logs")
    .select("id")
    .eq("action", "netshop_webhook")
    .eq("target_id", eventId)
    .maybeSingle();
  if (existingEvent) return NextResponse.json({ ok: true, duplicate: true });

  await supabase
    .from("logs")
    .insert({ action: "netshop_webhook", target_table: "orders", target_id: eventId, metadata: body });

  if (eventName.startsWith("payout.")) {
    // Producer/employee payouts are tracked via their own tables and
    // already store a payout_reference at dispatch time — nothing further
    // to reconcile here for now.
    return NextResponse.json({ ok: true, note: "payout_event_acknowledged" });
  }

  if (eventName === "refund.created" || eventName === "dispute.opened") {
    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order) return NextResponse.json({ ok: true, note: "no matching order" });
    await refundOrder(order.id);
    return NextResponse.json({ ok: true, status: "refunded" });
  }

  // charge.* events — orderId is our own orders.id, since we send it as
  // `reference` on POST /charges.
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return NextResponse.json({ ok: true, note: "no matching order" });
  if (order.status === "paid") return NextResponse.json({ ok: true, already_paid: true });

  // Server-to-server re-verification — never trust the webhook body alone;
  // NetShop's own docs call GET /charges/{id} "the source of truth".
  let authoritative;
  try {
    authoritative = await getAuthoritativeStatus(providerId ?? orderId);
  } catch (err) {
    await supabase.from("logs").insert({
      action: "netshop_status_check_error",
      target_table: "orders",
      target_id: order.id,
      metadata: { error: (err as Error).message },
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
