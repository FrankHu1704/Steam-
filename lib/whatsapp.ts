// Tsemba (SMS/WhatsApp/Email gateway) — same account as lib/sms.ts, mirroring
// its request shape against the /whatsapp/send endpoint. Best-effort,
// fire-and-forget: a failure here must never break the webhook that credits
// a sale — the email receipt already covers the same event. Check the
// "whatsapp_debug" rows in the `logs` table to confirm delivery actually
// works against the real Tsemba WhatsApp endpoint.

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMozambiquePhone } from "@/lib/phone";

const TSEMBA_BASE_URL = process.env.TSEMBA_API_URL || "https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway";

export async function sendWhatsapp(to: string, message: string): Promise<void> {
  const apiKey = process.env.TSEMBA_API_KEY;
  const supabase = createAdminClient();

  if (!apiKey || !to) {
    await supabase.from("logs").insert({
      action: "whatsapp_debug",
      metadata: { skipped: true, reason: !apiKey ? "no TSEMBA_API_KEY" : "no phone", to },
    });
    return;
  }

  const normalizedTo = normalizeMozambiquePhone(to);
  try {
    const res = await fetch(`${TSEMBA_BASE_URL}/whatsapp/send`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        instance_name: process.env.TSEMBA_WHATSAPP_INSTANCE || "TSEMBA",
        to: normalizedTo,
        message,
      }),
    });
    const responseBody = await res.text();
    await supabase.from("logs").insert({
      action: "whatsapp_debug",
      metadata: { to: normalizedTo, status: res.status, ok: res.ok, response: responseBody },
    });
  } catch (err) {
    await supabase.from("logs").insert({
      action: "whatsapp_debug",
      metadata: { to: normalizedTo, error: (err as Error).message },
    });
  }
}

export async function sendBuyerWhatsappReceipt(input: {
  phone: string;
  productTitle: string;
  accessUrl: string;
  supportName?: string | null;
  supportContact?: string | null;
}) {
  const sellerLabel = input.supportName ?? "o vendedor";
  const disclaimer =
    `\n\nA PayNow é apenas o sistema de pagamentos usado por ${sellerLabel} para processar esta compra. Não somos donos nem responsáveis pelo produto ou serviço vendido — para dúvidas sobre o conteúdo, contacte diretamente o vendedor. Contacte a PayNow apenas para reclamações relacionadas com o pagamento, ou para reportar fraude.` +
    (input.supportContact ? `\nContacto do vendedor: ${input.supportContact}` : "");

  const message = `Pagamento Confirmado!\n\nProduto: ${input.productTitle}\n\nAcesse o seu conteúdo pelo link abaixo:\n${input.accessUrl}\n\nObrigado pela sua compra!\n— PayNow${disclaimer}`;
  await sendWhatsapp(input.phone, message);
}
