// Easyhost (bulk SMS API) — sends "pagamento confirmado" to the producer
// and "compra confirmada" to the buyer on every paid order. Best-effort,
// fire-and-forget: a failure here must never break the webhook that
// credits a sale — the email/WhatsApp receipts already cover the same
// event for both sides.

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMozambiquePhone } from "@/lib/phone";

const EASYHOST_BASE_URL =
  process.env.EASYHOST_API_URL || "https://iiywyqfapgqkggvxyvfd.supabase.co/functions/v1/api";

export interface EasyhostBalance {
  balanceCredits: number;
  currency: string;
}

/** Powers the "Easyhost (SMS)" card on /admin/notifications. */
export async function getEasyhostBalance(): Promise<EasyhostBalance | null> {
  const apiKey = process.env.EASYHOST_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${EASYHOST_BASE_URL}/wallet`, {
      headers: { "X-API-Key": apiKey },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json || typeof json.balance_credits !== "number") return null;

    return { balanceCredits: json.balance_credits, currency: json.currency ?? "MZN" };
  } catch {
    return null;
  }
}

async function sendEasyhostSms(to: string, body: string): Promise<void> {
  const apiKey = process.env.EASYHOST_API_KEY;
  const supabase = createAdminClient();

  if (!apiKey || !to) {
    await supabase.from("logs").insert({
      action: "easyhost_sms_debug",
      metadata: { skipped: true, reason: !apiKey ? "no EASYHOST_API_KEY" : "no phone", to },
    });
    return;
  }

  const normalizedTo = normalizeMozambiquePhone(to);
  try {
    const res = await fetch(`${EASYHOST_BASE_URL}/sms/send`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalizedTo,
        body,
        ...(process.env.EASYHOST_SENDER_ID ? { sender: process.env.EASYHOST_SENDER_ID } : {}),
      }),
    });
    const responseBody = await res.text();
    await supabase.from("logs").insert({
      action: "easyhost_sms_debug",
      metadata: { to: normalizedTo, status: res.status, ok: res.ok, response: responseBody },
    });
  } catch (err) {
    await supabase.from("logs").insert({
      action: "easyhost_sms_debug",
      metadata: { to: normalizedTo, error: (err as Error).message },
    });
  }
}

// Kept free of accented characters on purpose: a single non-GSM-7 char
// (á, ã, ç, ...) forces UCS-2 encoding, which drops the per-segment limit
// from 160 to 70 — this stays a true single-segment SMS.
const SMS_MAX_LENGTH = 160;

function fitTitle(title: string, prefixLength: number, suffixLength: number): string {
  const maxTitleLength = SMS_MAX_LENGTH - prefixLength - suffixLength;
  const trimmed = title.trim();
  return trimmed.length > maxTitleLength ? `${trimmed.slice(0, Math.max(0, maxTitleLength - 3))}...` : trimmed;
}

export async function sendPaymentConfirmedSms(input: {
  phone: string;
  productTitle: string;
  amount: number;
  currency: string;
}) {
  const amountLabel = `${input.amount % 1 === 0 ? input.amount : input.amount.toFixed(2)} ${input.currency}`;
  const prefix = `VENDA CONFIRMADA\n+${amountLabel} na sua conta PagaJa\n`;
  const suffix = "";

  const title = fitTitle(input.productTitle, prefix.length, suffix.length);

  await sendEasyhostSms(input.phone, `${prefix}${title}${suffix}`);
}

export async function sendPurchaseConfirmedSms(input: {
  phone: string;
  productTitle: string;
  amount: number;
  currency: string;
  accessUrl: string;
}) {
  const amountLabel = `${input.amount % 1 === 0 ? input.amount : input.amount.toFixed(2)} ${input.currency}`;
  const prefix = "COMPRA CONFIRMADA\n";
  const suffix = ` - ${amountLabel}\nAcesse: ${input.accessUrl}`;

  const title = fitTitle(input.productTitle, prefix.length, suffix.length);

  await sendEasyhostSms(input.phone, `${prefix}${title}${suffix}`);
}
