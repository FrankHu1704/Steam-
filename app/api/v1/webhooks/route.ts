import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError, generateWebhookSecret, maskSecret } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const supabase = createAdminClient();
  const { data: webhook } = await supabase
    .from("developer_webhooks")
    .select("*")
    .eq("producer_id", auth.producerId)
    .single();

  if (!webhook) return Response.json({ success: true, webhook: null });

  return Response.json({
    success: true,
    webhook: {
      url: webhook.url,
      secret: maskSecret(webhook.secret),
      events: webhook.events,
      is_active: webhook.is_active,
    },
  });
}

export async function POST(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const events = Array.isArray(body.events) && body.events.length > 0 ? body.events : ["payment.completed"];

  if (!url || !/^https:\/\//.test(url)) {
    return apiError("url é obrigatório e deve começar com https://.", 400);
  }

  const supabase = createAdminClient();
  const secret = generateWebhookSecret();

  const { data: webhook, error } = await supabase
    .from("developer_webhooks")
    .upsert(
      { producer_id: auth.producerId, url, events, secret, is_active: true, updated_at: new Date().toISOString() },
      { onConflict: "producer_id" }
    )
    .select("*")
    .single();

  if (error || !webhook) return apiError(error?.message ?? "Falha ao configurar o webhook.", 400);

  return Response.json({
    success: true,
    message: "Webhook configurado com sucesso.",
    webhook: { url: webhook.url, secret: webhook.secret, events: webhook.events, is_active: webhook.is_active },
  });
}

export async function DELETE(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const supabase = createAdminClient();
  await supabase.from("developer_webhooks").delete().eq("producer_id", auth.producerId);

  return Response.json({ success: true, message: "Webhook removido." });
}
