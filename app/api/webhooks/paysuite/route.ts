import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaysuiteWebhookSignature, getAuthoritativeStatus } from "@/lib/paysuite";
import { creditOrder, notifyProducerOfFailedPayment } from "@/lib/order-fulfillment";

interface WebhookBody {
  event?: string;
  data?: {
    id?: string;
    amount?: number;
    reference?: string;
  };
}

// PaySuite's docs show payment.success/payment.failed events with
// data.reference = our own orders.id (set as `reference` when the charge
// was created in lib/paysuite.ts), plus payout.*/refund.* events this
// doesn't act on — payouts aren't created through PaySuite's API and
// refunds aren't implemented here yet, so those are just logged. Same as
// the Pagar webhook route, this never trusts the embedded status: it
// always re-fetches via GET /payments/:id before crediting anything. No
// timestamp header is documented for replay protection (unlike Pagar's
// `Pagar-Signature`), so this dedupes by event+data.id via the logs table
// instead.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  if (!verifyPaysuiteWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WebhookBody;
  const eventName = (body.event ?? "").toLowerCase();
  const paymentId = body.data?.id;
  const dedupeKey = paymentId ? `${eventName}:${paymentId}` : null;

  const supabase = createAdminClient();

  if (dedupeKey) {
    const { data: existingEvent } = await supabase
      .from("logs")
      .select("id")
      .eq("action", "paysuite_webhook")
      .eq("target_id", dedupeKey)
      .maybeSingle();
    if (existingEvent) return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabase.from("logs").insert({ action: "paysuite_webhook", target_table: "orders", target_id: dedupeKey, metadata: body });

  if (!eventName.startsWith("payment.")) {
    return NextResponse.json({ ok: true, note: "unhandled_event" });
  }

  const reference = body.data?.reference;
  if (!reference) return NextResponse.json({ ok: false, error: "missing_reference" }, { status: 400 });

  const { data: order } = await supabase.from("orders").select("*").eq("id", reference).single();
  if (!order) return NextResponse.json({ ok: true, note: "no_matching_order" });
  if (order.status === "paid") return NextResponse.json({ ok: true, already_paid: true });
  if (!paymentId) return NextResponse.json({ ok: false, error: "missing_payment_id" }, { status: 400 });

  let authoritative;
  try {
    authoritative = await getAuthoritativeStatus(paymentId);
  } catch (err) {
    await supabase.from("logs").insert({
      action: "paysuite_status_check_error",
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
  if (authoritative.amount != null && Math.abs(authoritative.amount - order.total_amount) > 0.5) {
    return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 409 });
  }

  await supabase.from("payments").update({ status: "paid", updated_at: new Date().toISOString() }).eq("order_id", order.id);
  await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);

  if (!order.credited_at) {
    await creditOrder(order.id);
  }

  return NextResponse.json({ ok: true, order_id: order.id });
}
