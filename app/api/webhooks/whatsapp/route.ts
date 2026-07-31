import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsapp } from "@/lib/whatsapp";
import { normalizeMozambiquePhone } from "@/lib/phone";
import { getWhatsappBotReply } from "@/lib/whatsapp-bot";

// Receives inbound WhatsApp messages from the Tsemba gateway (same account
// as lib/whatsapp.ts's outbound sends) and replies with the PagaJá
// assistant. Tsemba's exact inbound payload shape isn't confirmed yet, so
// this tries several common field names and — same as email_debug/
// whatsapp_debug elsewhere — always logs the full raw body first, so the
// real shape can be read back from Admin → Logs and the parsing tightened
// once real traffic arrives, instead of guessing blind forever.
//
// Optional shared-secret check: if WHATSAPP_INBOUND_SECRET is set, the
// webhook URL configured in Tsemba should include "?secret=..." matching
// it. Skipped entirely if the env var isn't set, since we don't yet know
// whether Tsemba's dashboard even supports custom query params/headers.
function extractIncoming(body: Record<string, unknown>): { from: string | null; text: string | null } {
  const data = (body?.data ?? {}) as Record<string, unknown>;
  const message = (data?.message ?? {}) as Record<string, unknown>;

  const from =
    (body?.from as string) ??
    (body?.sender as string) ??
    (body?.phone as string) ??
    (data?.from as string) ??
    (data?.sender as string) ??
    null;

  const text =
    (body?.message as string) ??
    (body?.text as string) ??
    (body?.body as string) ??
    (data?.text as string) ??
    (message?.conversation as string) ??
    (message?.text as string) ??
    null;

  return {
    from: typeof from === "string" ? from : null,
    text: typeof text === "string" ? text : null,
  };
}

export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_INBOUND_SECRET;
  if (secret && new URL(req.url).searchParams.get("secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));

  await supabase.from("logs").insert({ action: "whatsapp_inbound_debug", metadata: { body } });

  const { from, text } = extractIncoming(body);
  if (!from || !text) {
    return NextResponse.json({ ok: true, note: "no from/text found in payload" });
  }
  if (text.length > 2000) {
    return NextResponse.json({ ok: true, note: "message too long, ignored" });
  }

  const phone = normalizeMozambiquePhone(from);
  const reply = await getWhatsappBotReply(phone, text);
  await sendWhatsapp(phone, reply);

  return NextResponse.json({ ok: true });
}
