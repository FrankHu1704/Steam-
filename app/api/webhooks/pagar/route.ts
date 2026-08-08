import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPagarWebhookSignature, getStatusByReference } from "@/lib/pagar";
import { creditOrder, notifyProducerOfFailedPayment } from "@/lib/order-fulfillment";

interface WebhookBody {
  id?: string;
  type?: string;
  event?: string;
  reference?: string;
  data?: {
    payment?: { id?: string; reference?: string; status?: string };
    payout?: { id?: string; reference?: string };
    topup?: { id?: string; reference?: string };
    reference?: string;
  };
  payment?: { id?: string; reference?: string; status?: string };
}

// Pagar's docs list event names (payment.succeeded, payment.failed,
// wallet.topup.*, payout.*, webhook.test) but don't show the exact outer
// envelope shape — so, same as lib/netshop.ts's webhook route, this is
// intentionally defensive about where `reference` (our own orders.id)
// lives, and never trusts the embedded status: it always re-fetches via
// GET /payments/by-reference/:reference (Pagar's own documented recovery
// endpoint) before crediting anything.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Pagar-Signature");
  const eventId = request.headers.get("Pagar-Event-Id");

  if (!eventId) return NextResponse.json({ ok: false, error: "missing_event_id" }, { status: 400 });
  if (!verifyPagarWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: existingEvent } = await supabase
    .from("logs")
    .select("id")
    .eq("action", "pagar_webhook")
    .eq("target_id", eventId)
    .maybeSingle();
  if (existingEvent) return NextResponse.json({ ok: true, duplicate: true });

  const body = JSON.parse(rawBody) as WebhookBody;
  const eventName = (body.type ?? body.event ?? "").toLowerCase();
  const reference = body.data?.payment?.reference ?? body.payment?.reference ?? body.data?.reference ?? body.reference;

  await supabase.from("logs").insert({ action: "pagar_webhook", target_table: "orders", target_id: eventId, metadata: body });

  if (eventName === "webhook.test") {
    return NextResponse.json({ ok: true, note: "test_event_acknowledged" });
  }
  if (eventName.startsWith("wallet.topup.") || eventName.startsWith("payout.")) {
    // Topups fund the wallet manually; payouts aren't dispatched through
    // Pagar yet — nothing on our side needs reconciling for either.
    return NextResponse.json({ ok: true, note: "event_acknowledged" });
  }
  if (!eventName.startsWith("payment.")) {
    return NextResponse.json({ ok: true, note: "unhandled_event" });
  }
  if (!reference) return NextResponse.json({ ok: false, error: "missing_reference" }, { status: 400 });

  const { data: order } = await supabase.from("orders").select("*").eq("id", reference).single();
  if (!order) return NextResponse.json({ ok: true, note: "no_matching_order" });
  if (order.status === "paid") return NextResponse.json({ ok: true, already_paid: true });

  let authoritative;
  try {
    authoritative = await getStatusByReference(reference);
  } catch (err) {
    await supabase.from("logs").insert({
      action: "pagar_status_check_error",
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
  // Pagar requires an integer amountMzn while our own totals can carry
  // cents (coupons/bumps) — a tolerance wider than the other providers'
  // 0.01 accounts for that rounding, without letting a genuinely wrong
  // amount slip through.
  if (authoritative.amount != null && Math.abs(authoritative.amount - order.total_amount) > 1) {
    return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 409 });
  }
  if (authoritative.currency && authoritative.currency !== order.currency) {
    return NextResponse.json({ ok: false, error: "currency_mismatch" }, { status: 409 });
  }

  await supabase.from("payments").update({ status: "paid", updated_at: new Date().toISOString() }).eq("order_id", order.id);
  await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);

  if (!order.credited_at) {
    await creditOrder(order.id);
  }

  return NextResponse.json({ ok: true, order_id: order.id });
}
