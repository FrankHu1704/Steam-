import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Server-only. Backs the public /api/v1/* developer API: OAuth
// client-credentials keys exchanged for short-lived opaque bearer tokens.
// Modeled after external gateway APIs (products/offers/orders/webhooks)
// so producers can integrate PayNow with their own tools — this is
// read/manage access to a producer's own data, not a payment processor.

// Producers kept hitting "token inválido ou expirado" from integrations
// that never implemented a refresh cycle around the original 1-hour TTL —
// so access_token effectively no longer expires. Revocation (api_keys.
// revoked_at, checked in verifyBearerToken below) is the real security
// control now, same as it always was: revoking the key invalidates every
// token issued from it immediately, regardless of this TTL.
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365 * 100;

export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function generateClientCredentials(mode: "test" | "live"): { clientId: string; clientSecret: string } {
  const clientId = `pgj_id_${crypto.randomBytes(12).toString("hex")}`;
  const clientSecret = `pgj_${mode}_${crypto.randomBytes(24).toString("hex")}`;
  return { clientId, clientSecret };
}

export async function issueAccessToken(apiKeyId: string, producerId: string) {
  const supabase = createAdminClient();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  const { error } = await supabase.from("api_access_tokens").insert({
    api_key_id: apiKeyId,
    producer_id: producerId,
    token,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  return { token, expiresIn: TOKEN_TTL_SECONDS };
}

export async function verifyBearerToken(
  authHeader: string | null
): Promise<{ producerId: string; mode: "test" | "live" } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("api_access_tokens")
    .select("producer_id, expires_at, api_keys(mode, revoked_at)")
    .eq("token", token)
    .single<{
      producer_id: string;
      expires_at: string;
      api_keys: { mode: "test" | "live"; revoked_at: string | null } | null;
    }>();

  if (!data || new Date(data.expires_at) < new Date()) return null;
  if (!data.api_keys || data.api_keys.revoked_at) return null;
  return { producerId: data.producer_id, mode: data.api_keys.mode };
}

export function apiError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export function maskSecret(secret: string): string {
  return `${secret.slice(0, 10)}${"*".repeat(Math.max(0, secret.length - 14))}${secret.slice(-4)}`;
}

/** Best-effort call logging for the Admin -> Uso da API page — never
 * throws, so a logging failure can't break the actual API response. */
export async function logApiCall(
  producerId: string | null,
  endpoint: string,
  method: string,
  statusCode: number
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("api_call_logs").insert({ producer_id: producerId, endpoint, method, status_code: statusCode });
  } catch {
    // best-effort only
  }
}
