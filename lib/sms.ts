// Tsemba (SMS/WhatsApp/Email gateway) — used here only for SMS sale
// notifications. Best-effort, fire-and-forget: a failure here must never
// break the webhook that credits a sale — the email notification already
// covers the same event.

const TSEMBA_BASE_URL = process.env.TSEMBA_API_URL || "https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway";

function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/^0+/, "");
  return `+258${digits}`;
}

export async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = process.env.TSEMBA_API_KEY;
  if (!apiKey || !to) return;

  try {
    await fetch(`${TSEMBA_BASE_URL}/sms/send`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalizePhone(to),
        message,
        ...(process.env.TSEMBA_SENDER_ID ? { sender_id: process.env.TSEMBA_SENDER_ID } : {}),
      }),
    });
  } catch {
    // Non-fatal — the email notification already covers this event.
  }
}

const SMS_MAX_LENGTH = 160;

export async function sendSaleSms(input: { phone: string; productTitle: string; amount: number; currency: string }) {
  // Kept free of accented characters on purpose: a single non-GSM-7 char
  // (á, ã, ç, ...) forces UCS-2 encoding, which drops the per-segment
  // limit from 160 to 70 — this stays a true single-segment SMS.
  const amountLabel = `${input.amount % 1 === 0 ? input.amount : input.amount.toFixed(2)} ${input.currency}`;
  const prefix = `CONFIRMADO\n+${amountLabel} adicionado a sua conta referente a venda de `;
  const suffix = " na PagaJa.";

  const maxTitleLength = SMS_MAX_LENGTH - prefix.length - suffix.length;
  const title =
    input.productTitle.length > maxTitleLength
      ? `${input.productTitle.slice(0, Math.max(0, maxTitleLength - 3))}...`
      : input.productTitle;

  await sendSms(input.phone, `${prefix}${title}${suffix}`);
}
