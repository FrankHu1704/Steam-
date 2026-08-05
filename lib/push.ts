import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Server-only. Real web push (service worker + VAPID) — replaces the
// "Em breve" placeholder that used to sit in Definições -> Ferramentas
// Avançadas. Best-effort: a push failure must never break the caller
// (order crediting, etc).
let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  ensureConfigured();
  const supabase = createAdminClient();

  if (!configured) {
    await supabase.from("logs").insert({
      action: "push_debug",
      metadata: { skipped: true, reason: "VAPID not configured", userId },
    });
    return;
  }

  const { data: subscriptions } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subscriptions?.length) {
    await supabase.from("logs").insert({
      action: "push_debug",
      metadata: { skipped: true, reason: "no subscriptions for user", userId },
    });
    return;
  }

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 410/404 means the subscription is gone (browser data cleared,
        // uninstalled, etc) — remove it so we stop trying. Every failure
        // (this or any other status) gets logged — previously silent, so a
        // misconfigured key or a malformed subscription had no trace at all.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        await supabase.from("logs").insert({
          action: "push_send_error",
          metadata: { userId, subscriptionId: sub.id, status: status ?? null, error: (err as Error).message },
        });
      }
    })
  );
}
