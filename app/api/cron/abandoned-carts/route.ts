import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsapp } from "@/lib/whatsapp";
import { siteUrl } from "@/lib/email";

// Nudges buyers who started checkout (mobile money STK push sent, or just
// never finished) but never paid — mirrors the "recuperação de carrinho"
// feature common on other Mozambican checkout platforms. Runs on a cron
// schedule (see vercel.json); only pending orders in a specific age window
// are targeted so this never fires on very old/very fresh orders, and
// abandoned_notified_at guards against messaging the same order twice.
const MIN_AGE_MS = 15 * 60 * 1000; // give the STK push a chance to resolve first
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // don't dig up week-old test orders

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();

  const { data } = await supabase
    .from("orders")
    .select("id, buyer_phone, buyer_name, total_amount, currency, created_at, products(title, slug)")
    .eq("status", "pending")
    .is("abandoned_notified_at", null)
    .not("buyer_phone", "is", null)
    .lt("created_at", new Date(now - MIN_AGE_MS).toISOString())
    .gt("created_at", new Date(now - MAX_AGE_MS).toISOString());

  const orders = (data ?? []) as unknown as {
    id: string;
    buyer_phone: string | null;
    buyer_name: string;
    total_amount: number;
    currency: string;
    products: { title: string; slug: string } | null;
  }[];

  for (const order of orders) {
    const firstName = order.buyer_name?.split(" ")[0] || "";
    const message = `Olá${firstName ? ` ${firstName}` : ""}! Reparámos que ainda não concluiu a compra de "${order.products?.title ?? "o produto"}" (${order.total_amount} ${order.currency}). Finalize aqui: ${siteUrl()}/p/${order.products?.slug ?? ""}`;

    await sendWhatsapp(order.buyer_phone as string, message);
    await supabase.from("orders").update({ abandoned_notified_at: new Date().toISOString() }).eq("id", order.id);
  }

  return NextResponse.json({ ok: true, notified: orders.length });
}
