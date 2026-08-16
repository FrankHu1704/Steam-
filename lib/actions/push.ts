"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/auth";

interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function saveSubscription(subscription: PushSubscriptionInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // A push endpoint belongs to this browser/device, not to one PayNow
  // account — if the same device previously enabled notifications under a
  // different account (e.g. tested as producer, now enabling as admin),
  // the row already exists owned by that other user_id, and RLS's USING
  // clause blocks upsert() from reassigning someone else's row via the
  // session-scoped client. The admin client bypasses that, safe here
  // because we already confirmed the real signed-in user above.
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { error: error.message };
  return {};
}

export async function removeSubscription(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return {};
}

// Fire-and-forget diagnostic trail for client-side subscribe failures — the
// browser side has no dashboard to check, so without this the only trace of
// a WebKit/Chrome push error is whatever the user happens to screenshot.
export async function logPushClientError(input: { message: string; userAgent: string }): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  await admin.from("logs").insert({
    action: "push_client_error",
    metadata: { userId: user?.id ?? null, message: input.message, userAgent: input.userAgent },
  });
}

export async function hasPushSubscription(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return (count ?? 0) > 0;
}
