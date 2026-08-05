import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { attemptWebhookDelivery } from "@/lib/developer-webhooks";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

// Runs once a day (see vercel.json) — Vercel's free plan doesn't allow a
// tighter cron schedule, so a failed producer webhook gets retried once a
// day for up to MAX_ATTEMPTS days before being given up on for good.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from("webhook_deliveries")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString());

  let delivered = 0;
  let rescheduled = 0;
  let failed = 0;

  for (const delivery of pending ?? []) {
    const { data: webhook } = await supabase
      .from("developer_webhooks")
      .select("url, secret")
      .eq("producer_id", delivery.producer_id)
      .eq("is_active", true)
      .single();

    if (!webhook) {
      await supabase
        .from("webhook_deliveries")
        .update({ status: "failed", last_error: "Webhook removido ou desativado pelo produtor." })
        .eq("id", delivery.id);
      failed += 1;
      continue;
    }

    const result = await attemptWebhookDelivery(webhook.url, webhook.secret, delivery.payload as {
      event: string;
      data: Record<string, unknown>;
    });

    if (result.ok) {
      await supabase
        .from("webhook_deliveries")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("id", delivery.id);
      delivered += 1;
      continue;
    }

    const attemptCount = delivery.attempt_count + 1;
    const errorLabel = result.error ?? `HTTP ${result.status}`;

    if (attemptCount >= MAX_ATTEMPTS) {
      await supabase
        .from("webhook_deliveries")
        .update({ status: "failed", attempt_count: attemptCount, last_error: errorLabel })
        .eq("id", delivery.id);
      failed += 1;
    } else {
      await supabase
        .from("webhook_deliveries")
        .update({
          attempt_count: attemptCount,
          last_error: errorLabel,
          next_attempt_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
        })
        .eq("id", delivery.id);
      rescheduled += 1;
    }
  }

  await supabase.from("logs").insert({
    action: "webhook_retry_cron",
    metadata: { total: pending?.length ?? 0, delivered, rescheduled, failed },
  });

  return NextResponse.json({ ok: true, total: pending?.length ?? 0, delivered, rescheduled, failed });
}
