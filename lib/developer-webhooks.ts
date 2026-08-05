import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/types/database";

// Outgoing webhook fired to a producer's own configured endpoint when one
// of their sales is confirmed — lets them integrate PagaJá with their own
// tools, same shape as the /api/v1/webhooks the producer registers via the
// developer API. Best-effort: a failure here must never break order
// crediting, but a failed delivery is now queued into webhook_deliveries
// for the daily retry cron (app/api/cron/webhook-retry) instead of being
// lost — see that file for why retries are once-a-day, not minute-scale.

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

export async function attemptWebhookDelivery(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pagaja-signature": `t=${timestamp},v1=${signature}`,
      },
      body: rawBody,
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function dispatchPaymentCompletedWebhook(
  order: Order,
  product: { id: string | null; title: string }
): Promise<void> {
  const supabase = createAdminClient();

  const { data: webhook } = await supabase
    .from("developer_webhooks")
    .select("*")
    .eq("producer_id", order.producer_id)
    .eq("is_active", true)
    .single();

  if (!webhook || !webhook.events.includes("payment.completed")) return;

  const payload: WebhookPayload = {
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

  const result = await attemptWebhookDelivery(webhook.url, webhook.secret, payload);

  await supabase.from("logs").insert({
    action: "developer_webhook_delivery",
    target_table: "orders",
    target_id: order.id,
    metadata: { url: webhook.url, status: result.status ?? null, ok: result.ok, error: result.error ?? null },
  });

  if (!result.ok) {
    await supabase.from("webhook_deliveries").insert({
      producer_id: order.producer_id,
      order_id: order.id,
      event: "payment.completed",
      payload,
      attempt_count: 1,
      status: "pending",
      last_error: result.error ?? `HTTP ${result.status}`,
      next_attempt_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}
