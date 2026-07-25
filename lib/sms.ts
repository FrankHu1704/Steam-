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

export async function sendSaleSms(input: { phone: string; productTitle: string; amount: number; currency: string }) {
  await sendSms(
    input.phone,
    `PagaJá: Nova venda! "${input.productTitle}" vendido por ${input.amount} ${input.currency}. Saldo já atualizado no seu painel.`
  );
}
