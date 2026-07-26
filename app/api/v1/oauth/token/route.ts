import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSecret, issueAccessToken, apiError, logApiCall } from "@/lib/api-auth";

function secretMatches(expectedHash: string, providedSecret: string): boolean {
  const providedHash = hashSecret(providedSecret);
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(providedHash));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    clientId = body.client_id;
    clientSecret = body.client_secret;
  } else {
    const form = await req.formData().catch(() => null);
    clientId = form?.get("client_id")?.toString();
    clientSecret = form?.get("client_secret")?.toString();
  }

  if (!clientId || !clientSecret) {
    await logApiCall(null, "/api/v1/oauth/token", "POST", 400);
    return apiError("client_id e client_secret são obrigatórios.", 400);
  }

  const supabase = createAdminClient();
  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("*")
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .single();

  if (!apiKey || !secretMatches(apiKey.client_secret_hash, clientSecret)) {
    await logApiCall(apiKey?.producer_id ?? null, "/api/v1/oauth/token", "POST", 401);
    return apiError("Credenciais inválidas.", 401);
  }

  const { token, expiresIn } = await issueAccessToken(apiKey.id, apiKey.producer_id);

  await logApiCall(apiKey.producer_id, "/api/v1/oauth/token", "POST", 200);
  return Response.json({
    access_token: token,
    token_type: "Bearer",
    scope: "read write products offers orders webhooks",
    expires_in: expiresIn,
  });
}
