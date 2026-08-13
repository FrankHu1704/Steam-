import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthoritativeStatus } from "@/lib/paymoz";
import { creditOrder, notifyProducerOfFailedPayment } from "@/lib/order-fulfillment";

interface WebhookBody {
  event?: string;
  data?: {
    id?: string;
    reference?: string;
    amount?: number;
  };
}

// Unlike Pagar/PaySuite, PayMoz's `reference` is NOT our own orders.id —
// it's the random 11-character token generateReference() (lib/paymoz.ts)
// creates per charge, since order.id (a UUID) doesn't fit PayMoz's
// required format. So this looks the order up via the `payments` row
// stored with that reference as provider_payment_id, not orders.id
// directly. No signature scheme is documented for this webhook at all —
// see lib/paymoz.ts — so the re-fetch via GET /payments/reference/:ref
// before crediting anything is the ONLY thing standing between this
// endpoint and a forged "payment.success" event, not just a
// belt-and-suspenders check like it is for the other providers.
export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventName = (body.event ?? "").toLowerCase();
  const reference = body.data?.reference;
  const dedupeKey = reference ? `${eventName}:${reference}` : null;

  const supabase = createAdminClient();

  if (dedupeKey) {
    const { data: existingEvent } = await supabase
      .from("logs")
      .select("id")
      .eq("action", "paymoz_webhook")
      .eq("target_id", dedupeKey)
      .maybeSingle();
    if (existingEvent) return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabase.from("logs").insert({ action: "paymoz_webhook", target_table: "orders", target_id: dedupeKey, metadata: body });

  if (!eventName.startsWith("payment.")) {
    return NextResponse.json({ ok: true, note: "unhandled_event" });
  }
  if (!reference) return NextResponse.json({ ok: false, error: "missing_reference" }, { status: 400 });

  const { data: payment } = await supabase
    .from("payments")
    .select("order_id")
    .eq("provider", "paymoz")
    .eq("provider_payment_id", reference)
    .maybeSingle();
  if (!payment) return NextResponse.json({ ok: true, note: "no_matching_payment" });

  const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
  if (!order) return NextResponse.json({ ok: true, note: "no_matching_order" });
  if (order.status === "paid") return NextResponse.json({ ok: true, already_paid: true });

  let authoritative;
  try {
    authoritative = await getAuthoritativeStatus(reference);
  } catch (err) {
    await supabase.from("logs").insert({
      action: "paymoz_status_check_error",
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
