import { createClient } from "@/lib/supabase/server";
import { getOrderStatus } from "@/lib/actions/checkout";
import type {
  ApiCallLog,
  ApiKey,
  Category,
  LogEntry,
  Order,
  Payment,
  Product,
  ProductionUnlock,
  Profile,
  Setting,
  Withdrawal,
} from "@/types/database";

export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { user, profile: profile as Profile };
}

export interface AdminOverview {
  usersCount: number;
  productsPendingCount: number;
  totalSales: number;
  withdrawalsPendingCount: number;
  withdrawalsPendingAmount: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();

  const [{ count: usersCount }, { count: productsPendingCount }, { data: paidOrders }, { data: pendingWithdrawals }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("total_amount").eq("status", "paid"),
      supabase.from("withdrawals").select("amount").eq("status", "pending"),
    ]);

  return {
    usersCount: usersCount ?? 0,
    productsPendingCount: productsPendingCount ?? 0,
    totalSales: (paidOrders ?? []).reduce((sum, o) => sum + o.total_amount, 0),
    withdrawalsPendingCount: pendingWithdrawals?.length ?? 0,
    withdrawalsPendingAmount: (pendingWithdrawals ?? []).reduce((sum, w) => sum + w.amount, 0),
  };
}

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return (data as Profile[]) ?? [];
}

export interface AdminProduct extends Product {
  producer_name: string;
  producer_created_at: string | null;
  producer_rejected_count: number;
}

export async function getAllProducts(status?: string): Promise<AdminProduct[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, profiles!producer_id(name, created_at)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const products = (data ?? []) as (Product & { profiles: { name: string; created_at: string } | null })[];

  // Fraud-review signal for the moderation page: how many of this
  // producer's other products have already been rejected — a brand new
  // account with a history of rejections is the pattern worth a closer
  // look before approving a pending product.
  const producerIds = Array.from(new Set(products.map((p) => p.producer_id)));
  const { data: rejectedRows } =
    producerIds.length > 0
      ? await supabase.from("products").select("producer_id").eq("status", "rejected").in("producer_id", producerIds)
      : { data: [] as { producer_id: string }[] };
  const rejectedCounts = new Map<string, number>();
  for (const r of rejectedRows ?? []) {
    rejectedCounts.set(r.producer_id, (rejectedCounts.get(r.producer_id) ?? 0) + 1);
  }

  return products.map((p) => ({
    ...p,
    producer_name: p.profiles?.name ?? "—",
    producer_created_at: p.profiles?.created_at ?? null,
    producer_rejected_count: rejectedCounts.get(p.producer_id) ?? 0,
  }));
}

export interface AdminOrder extends Order {
  product_title: string;
}

export async function getAllOrders(limit = 100): Promise<AdminOrder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, products(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  const orders = (data ?? []) as (Order & { products: { title: string } | null })[];

  // Reconcile any stale "pending" orders with the payment provider every
  // time this list is loaded, so stuck payments resolve themselves without
  // anyone having to click "Marcar como Falhado" manually.
  await Promise.all(
    orders
      .filter((o) => o.status === "pending")
      .map(async (o) => {
        const result = await getOrderStatus(o.id);
        if (result.status) o.status = result.status as Order["status"];
      })
  );

  return orders.map((o) => ({
    ...o,
    // Manual/API charges (source "api") have no product_id at all — fall
    // back to the free-text description given at charge time, same as the
    // producer-facing labels in lib/order-fulfillment.ts, instead of a
    // bare dash that looked like missing data.
    product_title: o.products?.title ?? o.description ?? "—",
  }));
}

export interface AdminOrderDetail extends Order {
  product_title: string;
  product_slug: string | null;
  producer_name: string;
  producer_email: string;
  payments: Payment[];
}

export async function getOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();

  const [{ data: order }, { data: payments }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, products(title, slug), profiles!producer_id(name, email)")
      .eq("id", orderId)
      .single<Order & { products: { title: string; slug: string } | null; profiles: { name: string; email: string } | null }>(),
    supabase.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
  ]);

  if (!order) return null;

  return {
    ...order,
    product_title: order.products?.title ?? order.description ?? "—",
    product_slug: order.products?.slug ?? null,
    producer_name: order.profiles?.name ?? "—",
    producer_email: order.profiles?.email ?? "—",
    payments: (payments as Payment[]) ?? [],
  };
}

export interface AdminWithdrawal extends Withdrawal {
  producer_name: string;
  producer_email: string;
}

export async function getAllWithdrawals(status?: string): Promise<AdminWithdrawal[]> {
  const supabase = await createClient();
  let query = supabase
    .from("withdrawals")
    .select("*, profiles!producer_id(name, email)")
    .order("requested_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return ((data ?? []) as (Withdrawal & { profiles: { name: string; email: string } | null })[]).map((w) => ({
    ...w,
    producer_name: w.profiles?.name ?? "—",
    producer_email: w.profiles?.email ?? "—",
  }));
}

export interface AdminProductionUnlock extends ProductionUnlock {
  producer_name: string;
  producer_email: string;
}

export async function getAllProductionUnlocks(): Promise<AdminProductionUnlock[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_unlocks")
    .select("*, profiles!producer_id(name, email)")
    .order("created_at", { ascending: false });
  return ((data ?? []) as (ProductionUnlock & { profiles: { name: string; email: string } | null })[]).map((u) => ({
    ...u,
    producer_name: u.profiles?.name ?? "—",
    producer_email: u.profiles?.email ?? "—",
  }));
}

export interface RevenuePeriod {
  grossVolume: number;
  salesFees: number;
  withdrawalFees: number;
  employeeCommissions: number;
  netProfit: number;
}

export interface PlatformRevenue {
  today: RevenuePeriod;
  yesterday: RevenuePeriod;
  last7Days: RevenuePeriod;
  thisMonth: RevenuePeriod;
  allTime: RevenuePeriod;
}

const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2 year-round, no DST

function maputoDayStart(date: Date): Date {
  const local = new Date(date.getTime() + MAPUTO_OFFSET_MS);
  const localMidnight = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 0, 0, 0));
  return new Date(localMidnight.getTime() - MAPUTO_OFFSET_MS);
}

function emptyPeriod(): RevenuePeriod {
  return { grossVolume: 0, salesFees: 0, withdrawalFees: 0, employeeCommissions: 0, netProfit: 0 };
}

export async function getPlatformRevenue(): Promise<PlatformRevenue> {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = maputoDayStart(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const last7DaysStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const localNow = new Date(now.getTime() + MAPUTO_OFFSET_MS);
  const monthStart = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1, 0, 0, 0) - MAPUTO_OFFSET_MS
  );

  const [{ data: orders }, { data: withdrawals }, { data: employeeCommissions }] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount, platform_fee_amount, paid_at")
      .eq("status", "paid")
      .not("platform_fee_amount", "is", null),
    supabase.from("withdrawals").select("fee_amount, paid_at").in("status", ["paid", "confirmed"]),
    supabase.from("employee_commissions").select("amount, created_at"),
  ]);

  const periods = {
    today: emptyPeriod(),
    yesterday: emptyPeriod(),
    last7Days: emptyPeriod(),
    thisMonth: emptyPeriod(),
    allTime: emptyPeriod(),
  };

  // Every row is bucketed into every period it falls within (a sale from
  // this morning counts toward "today", "last 7 days", "this month" and
  // "all time" all at once) — one pass per table instead of one query per
  // period x table.
  function bucketsFor(at: Date | null): (keyof typeof periods)[] {
    const keys: (keyof typeof periods)[] = ["allTime"];
    if (!at) return keys;
    if (at >= monthStart) keys.push("thisMonth");
    if (at >= last7DaysStart) keys.push("last7Days");
    if (at >= yesterdayStart && at < todayStart) keys.push("yesterday");
    if (at >= todayStart) keys.push("today");
    return keys;
  }

  for (const o of orders ?? []) {
    const at = o.paid_at ? new Date(o.paid_at) : null;
    const fee = o.platform_fee_amount ?? 0;
    for (const key of bucketsFor(at)) {
      periods[key].grossVolume += o.total_amount;
      periods[key].salesFees += fee;
    }
  }

  for (const w of withdrawals ?? []) {
    const at = w.paid_at ? new Date(w.paid_at) : null;
    for (const key of bucketsFor(at)) {
      periods[key].withdrawalFees += w.fee_amount;
    }
  }

  // Recruiter commission paid to collaborators — accrued the moment the
  // sale is credited (see lib/order-fulfillment.ts), always <= the platform
  // fee already counted above, so it's a real cost against that revenue,
  // not additional spend.
  for (const c of employeeCommissions ?? []) {
    const at = new Date(c.created_at);
    for (const key of bucketsFor(at)) {
      periods[key].employeeCommissions += c.amount;
    }
  }

  for (const key of Object.keys(periods) as (keyof typeof periods)[]) {
    const p = periods[key];
    p.netProfit = p.salesFees + p.withdrawalFees - p.employeeCommissions;
  }

  return periods;
}

export interface ApiUsageProducer {
  producerId: string;
  producerName: string;
  producerEmail: string;
  testKeys: number;
  liveKeys: number;
  callsLast30Days: number;
}

export async function getApiUsageSummary(): Promise<{
  totalKeys: number;
  activeKeys: number;
  liveKeys: number;
  callsLast30Days: number;
  producers: ApiUsageProducer[];
  recentCalls: ApiCallLog[];
}> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: keys }, { data: calls }, { data: recentCalls }] = await Promise.all([
    supabase.from("api_keys").select("*, profiles!producer_id(name, email)"),
    supabase.from("api_call_logs").select("producer_id").gte("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("api_call_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  const keyRows = (keys ?? []) as (ApiKey & { profiles: { name: string; email: string } | null })[];
  const callsByProducer = new Map<string, number>();
  for (const c of calls ?? []) {
    if (!c.producer_id) continue;
    callsByProducer.set(c.producer_id, (callsByProducer.get(c.producer_id) ?? 0) + 1);
  }

  const byProducer = new Map<string, ApiUsageProducer>();
  for (const k of keyRows) {
    const existing = byProducer.get(k.producer_id) ?? {
      producerId: k.producer_id,
      producerName: k.profiles?.name ?? "—",
      producerEmail: k.profiles?.email ?? "—",
      testKeys: 0,
      liveKeys: 0,
      callsLast30Days: callsByProducer.get(k.producer_id) ?? 0,
    };
    if (!k.revoked_at) {
      if (k.mode === "live") existing.liveKeys += 1;
      else existing.testKeys += 1;
    }
    byProducer.set(k.producer_id, existing);
  }

  return {
    totalKeys: keyRows.length,
    activeKeys: keyRows.filter((k) => !k.revoked_at).length,
    liveKeys: keyRows.filter((k) => !k.revoked_at && k.mode === "live").length,
    callsLast30Days: calls?.length ?? 0,
    producers: Array.from(byProducer.values()).sort((a, b) => b.callsLast30Days - a.callsLast30Days),
    recentCalls: (recentCalls as ApiCallLog[]) ?? [],
  };
}

export async function getProducerApiLogs(
  producerId: string,
  limit = 300
): Promise<{ producerName: string; producerEmail: string; logs: ApiCallLog[] } | null> {
  const supabase = await createClient();

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", producerId).single(),
    supabase
      .from("api_call_logs")
      .select("*")
      .eq("producer_id", producerId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (!profile) return null;

  return {
    producerName: profile.name,
    producerEmail: profile.email,
    logs: (logs as ApiCallLog[]) ?? [],
  };
}

export interface AdminUserDetail {
  profile: Profile;
  products: Product[];
  ordersAsProducer: AdminOrder[];
  purchasesAsBuyer: AdminOrder[];
  withdrawals: Withdrawal[];
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const supabase = await createClient();

  const [{ data: profile }, { data: products }, { data: ordersAsProducer }, { data: purchasesAsBuyer }, { data: withdrawals }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("products").select("*").eq("producer_id", userId).order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*, products(title)")
        .eq("producer_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("orders")
        .select("*, products(title)")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("withdrawals").select("*").eq("producer_id", userId).order("requested_at", { ascending: false }),
    ]);

  if (!profile) return null;

  const mapOrders = (rows: (Order & { products: { title: string } | null })[] | null) =>
    (rows ?? []).map((o) => ({ ...o, product_title: o.products?.title ?? "—" }));

  return {
    profile: profile as Profile,
    products: (products as Product[]) ?? [],
    ordersAsProducer: mapOrders(ordersAsProducer as (Order & { products: { title: string } | null })[] | null),
    purchasesAsBuyer: mapOrders(purchasesAsBuyer as (Order & { products: { title: string } | null })[] | null),
    withdrawals: (withdrawals as Withdrawal[]) ?? [],
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data as Category[]) ?? [];
}

export async function getAllSettings(): Promise<Setting[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").order("key");
  return (data as Setting[]) ?? [];
}

export async function getRecentLogs(limit = 100): Promise<LogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("logs").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data as LogEntry[]) ?? [];
}

export interface WhatsappBotConversationSummary {
  phone: string;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string;
  lastRole: "user" | "assistant";
}

export async function getWhatsappBotConversations(limit = 500): Promise<WhatsappBotConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_bot_messages")
    .select("phone, role, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const byPhone = new Map<string, WhatsappBotConversationSummary>();
  for (const row of data ?? []) {
    const existing = byPhone.get(row.phone);
    if (!existing) {
      byPhone.set(row.phone, {
        phone: row.phone,
        messageCount: 1,
        lastMessage: row.content,
        lastMessageAt: row.created_at,
        lastRole: row.role as "user" | "assistant",
      });
    } else {
      existing.messageCount += 1;
    }
  }

  return Array.from(byPhone.values()).sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}

export interface WhatsappBotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getWhatsappBotThread(phone: string, limit = 200): Promise<WhatsappBotMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_bot_messages")
    .select("id, role, content, created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as WhatsappBotMessage[]) ?? [];
}

export interface B2CAttempt {
  id: string;
  created_at: string;
  withdrawalId: string | null;
  manual: boolean;
  producerName: string;
  destination: string | null;
  note: string | null;
  amount: number;
  netAmount: number;
  currency: string;
  payoutMethod: string;
  provider: string;
  success: boolean;
  error: string | null;
  reference: string | null;
}

export async function getB2CHistory(limit = 100): Promise<B2CAttempt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs")
    .select("*")
    .eq("action", "b2c_payout_attempt")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as LogEntry[]).map((log) => {
    const m = (log.metadata ?? {}) as Record<string, unknown>;
    const manual = Boolean(m.manual);
    return {
      id: log.id,
      created_at: log.created_at,
      withdrawalId: log.target_id,
      manual,
      producerName: manual ? "Pagamento manual (admin)" : (m.producer_name as string) ?? "—",
      destination: (m.destination as string | null) ?? null,
      note: (m.note as string | null) ?? null,
      amount: (m.amount as number) ?? 0,
      netAmount: (m.net_amount as number) ?? 0,
      currency: (m.currency as string) ?? "MZN",
      payoutMethod: (m.payout_method as string) ?? "—",
      provider: (m.provider as string) ?? "—",
      success: Boolean(m.success),
      error: (m.error as string | null) ?? null,
      reference: (m.reference as string | null) ?? null,
    };
  });
}
