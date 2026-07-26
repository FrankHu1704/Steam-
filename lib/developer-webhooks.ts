import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/types/database";

// Outgoing webhook fired to a producer's own configured endpoint when one
// of their sales is confirmed — lets them integrate PagaJá with their own
// tools, same shape as the /api/v1/webhooks the producer registers via the
// developer API. Best-effort, fire-and-forget: a failure here must never
// break order crediting.
export async function dispatchPaymentCompletedWebhook(
  order: Order,
  product: { id: string; title: string }
): Promise<void> {
  const supabase = createAdminClient();

  const { data: webhook } = await supabase
    .from("developer_webhooks")
    .select("*")
    .eq("producer_id", order.producer_id)
    .eq("is_active", true)
    .single();

  if (!webhook || !webhook.events.includes("payment.completed")) return;

  const payload = {
    event: "payment.completed",
    data: {
      id: order.id,
      customer: { name: order.buyer_name, email: order.buyer_email, phone: order.buyer_phone },
      product: { id: product.id, name: product.title, price: order.total_amount },
      amount: order.total_amount,
      currency: order.currency,
      status: "paid",
      created_at: order.created_at,
    },
  };

  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", webhook.secret).update(`${timestamp}.${rawBody}`).digest("hex");

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pagaja-signature": `t=${timestamp},v1=${signature}`,
      },
      body: rawBody,
      signal: AbortSignal.timeout(10_000),
    });
    await supabase.from("logs").insert({
      action: "developer_webhook_delivery",
      target_table: "orders",
      target_id: order.id,
      metadata: { url: webhook.url, status: res.status, ok: res.ok },
    });
  } catch (err) {
    await supabase.from("logs").insert({
      action: "developer_webhook_delivery",
      target_table: "orders",
      target_id: order.id,
      metadata: { url: webhook.url, error: (err as Error).message },
    });
  }
}
