import crypto from "node:crypto";

// Server-side leg of the Facebook Pixel setup — the browser Pixel (base
// script + PageView, wired per-product in lib/pixels.ts via
// products.facebook_pixel_id) already fires "Purchase" client-side on the
// success step; this sends the SAME event, with the SAME event_id, from our
// own backend. Facebook dedupes any pair sharing an event_id, so campaigns
// keep learning from confirmed, gateway-verified purchases even when the
// browser event is blocked (ad blockers, iOS ITP, a closed tab before it
// fires) — which is what actually lets Meta's algorithm find more people
// likely to convert (the whole point of feeding it a clean "Purchase" signal).
const API_VERSION = "v21.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface PurchaseEventInput {
  pixelId: string;
  accessToken: string;
  eventId: string; // orders.id — must match the client-side fbq(...) eventID for dedup.
  eventSourceUrl: string;
  value: number;
  currency: string;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  testEventCode?: string | null;
}

export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<{ ok: boolean; error?: string }> {
  const userData: Record<string, unknown> = {};
  if (input.buyerEmail) userData.em = [sha256(input.buyerEmail)];
  if (input.buyerPhone) userData.ph = [sha256(input.buyerPhone.replace(/\D/g, ""))];
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: { currency: input.currency, value: input.value },
      },
    ],
    ...(input.testEventCode ? { test_event_code: input.testEventCode } : {}),
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(input.pixelId)}/events?access_token=${encodeURIComponent(input.accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: json?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
