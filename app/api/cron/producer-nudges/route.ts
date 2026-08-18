import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";

// Daily motivational/reminder push notifications for producers — separate
// from the on-demand notifications the admin sends manually (see
// lib/actions/push.ts / /admin/notificacoes). Each nudge type is throttled
// via the producer_nudges log so the same producer doesn't get spammed
// every single day the condition still holds (see 0059_producer_nudges.sql).
// is_cto producers are skipped throughout: they're admin-appointed, not
// regular sellers building up a store, so "publish your first product" /
// "your sales are stalled" nudges don't apply to them.
const DAY_MS = 24 * 60 * 60 * 1000;

const NO_PRODUCTS_MIN_AGE_MS = 20 * 60 * 60 * 1000; // give onboarding a few hours before nudging
const NO_SALES_MIN_AGE_MS = 3 * DAY_MS; // matches the "no product" deletion grace — by then they should have something live
const NO_SALES_THROTTLE_MS = 3 * DAY_MS;
const WITHDRAWAL_THROTTLE_MS = 5 * DAY_MS;
const PENDING_PRODUCT_MIN_AGE_MS = 24 * 60 * 60 * 1000; // give the admin a day to review before nudging
const PENDING_PRODUCT_THROTTLE_MS = 2 * DAY_MS;

type NudgeType = "no_products" | "no_sales" | "withdrawal_available" | "first_sale" | "pending_approval";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();

  const { data: producers } = await supabase
    .from("profiles")
    .select("id, name, became_producer_at, lifetime_sales_count, balance_available")
    .eq("role", "producer")
    .eq("is_cto", false)
    .not("became_producer_at", "is", null);

  if (!producers?.length) return NextResponse.json({ ok: true, sent: 0 });

  const producerIds = producers.map((p) => p.id);

  const [{ data: productRows }, { data: withdrawalRows }, { data: minSetting }, { data: recentNudges }] =
    await Promise.all([
      supabase.from("products").select("producer_id, status, created_at").in("producer_id", producerIds),
      supabase
        .from("withdrawals")
        .select("producer_id, requested_at")
        .in("producer_id", producerIds)
        .order("requested_at", { ascending: false }),
      supabase.from("settings").select("value").eq("key", "withdrawal_minimum_amount").single(),
      supabase
        .from("producer_nudges")
        .select("producer_id, nudge_type, sent_at")
        .in("producer_id", producerIds)
        .gte("sent_at", new Date(now - 30 * DAY_MS).toISOString()),
    ]);

  const minimumWithdrawal = Number(minSetting?.value ?? 200);

  const productsByProducer = new Map<string, { status: string; created_at: string }[]>();
  for (const row of productRows ?? []) {
    const list = productsByProducer.get(row.producer_id) ?? [];
    list.push({ status: row.status, created_at: row.created_at });
    productsByProducer.set(row.producer_id, list);
  }

  const lastWithdrawalByProducer = new Map<string, number>();
  for (const row of withdrawalRows ?? []) {
    if (!lastWithdrawalByProducer.has(row.producer_id)) {
      lastWithdrawalByProducer.set(row.producer_id, new Date(row.requested_at).getTime());
    }
  }

  const lastNudgeAt = new Map<string, number>();
  for (const row of recentNudges ?? []) {
    const key = `${row.producer_id}:${row.nudge_type}`;
    const sentAt = new Date(row.sent_at).getTime();
    if (!lastNudgeAt.has(key) || sentAt > lastNudgeAt.get(key)!) lastNudgeAt.set(key, sentAt);
  }

  const wasSentWithin = (producerId: string, type: NudgeType, windowMs: number) => {
    const sentAt = lastNudgeAt.get(`${producerId}:${type}`);
    return sentAt != null && now - sentAt < windowMs;
  };
  const wasEverSent = (producerId: string, type: NudgeType) => lastNudgeAt.has(`${producerId}:${type}`);

  const toSend: { producerId: string; type: NudgeType; title: string; body: string; url?: string }[] = [];

  for (const producer of producers) {
    const becameProducerAt = new Date(producer.became_producer_at as string).getTime();
    const age = now - becameProducerAt;
    const products = productsByProducer.get(producer.id) ?? [];
    const firstName = producer.name?.split(" ")[0] || "";

    if (products.length === 0 && age > NO_PRODUCTS_MIN_AGE_MS && !wasEverSent(producer.id, "no_products")) {
      toSend.push({
        producerId: producer.id,
        type: "no_products",
        title: "Publica o teu primeiro produto! 🚀",
        body: `Olá${firstName ? ` ${firstName}` : ""}! Ainda não publicaste nenhum produto — publica agora e começa a vender.`,
        url: "/dashboard/products/new",
      });
    }

    if (
      products.length > 0 &&
      producer.lifetime_sales_count === 0 &&
      age > NO_SALES_MIN_AGE_MS &&
      !wasSentWithin(producer.id, "no_sales", NO_SALES_THROTTLE_MS)
    ) {
      toSend.push({
        producerId: producer.id,
        type: "no_sales",
        title: "As tuas vendas estão paradas 📉",
        body: "Ainda não tiveste nenhuma venda. Partilha o teu produto nas redes sociais e no WhatsApp hoje!",
        url: "/dashboard/products",
      });
    }

    if (
      producer.balance_available >= minimumWithdrawal &&
      now - (lastWithdrawalByProducer.get(producer.id) ?? 0) > WITHDRAWAL_THROTTLE_MS &&
      !wasSentWithin(producer.id, "withdrawal_available", WITHDRAWAL_THROTTLE_MS)
    ) {
      toSend.push({
        producerId: producer.id,
        type: "withdrawal_available",
        title: "Tens saldo disponível! 💰",
        body: `Tens ${producer.balance_available} MT disponíveis para levantar. Faz o teu pedido de saque agora.`,
        url: "/dashboard/withdrawals",
      });
    }

    if (producer.lifetime_sales_count >= 1 && !wasEverSent(producer.id, "first_sale")) {
      toSend.push({
        producerId: producer.id,
        type: "first_sale",
        title: "Parabéns pela tua primeira venda! 🎉",
        body: "Acabaste de vender o teu primeiro produto na PayNow. Continua assim!",
        url: "/dashboard",
      });
    }

    const pendingProducts = products.filter(
      (p) => p.status === "pending" && now - new Date(p.created_at).getTime() > PENDING_PRODUCT_MIN_AGE_MS
    );
    if (pendingProducts.length > 0 && !wasSentWithin(producer.id, "pending_approval", PENDING_PRODUCT_THROTTLE_MS)) {
      toSend.push({
        producerId: producer.id,
        type: "pending_approval",
        title: "Produto em análise ⏳",
        body:
          pendingProducts.length === 1
            ? "O teu produto ainda está a aguardar aprovação da nossa equipa."
            : `Tens ${pendingProducts.length} produtos a aguardar aprovação da nossa equipa.`,
        url: "/dashboard/products",
      });
    }
  }

  for (const nudge of toSend) {
    await sendPushToUser(nudge.producerId, { title: nudge.title, body: nudge.body, url: nudge.url });
    await supabase.from("producer_nudges").insert({ producer_id: nudge.producerId, nudge_type: nudge.type });
  }

  return NextResponse.json({ ok: true, sent: toSend.length });
}
