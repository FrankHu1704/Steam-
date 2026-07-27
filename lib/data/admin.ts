import { createClient } from "@/lib/supabase/server";
import { getOrderStatus } from "@/lib/actions/checkout";
import type {
  ApiCallLog,
  ApiKey,
  Category,
  LogEntry,
  Order,
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
}

export async function getAllProducts(status?: string): Promise<AdminProduct[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, profiles!producer_id(name)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return ((data ?? []) as (Product & { profiles: { name: string } | null })[]).map((p) => ({
    ...p,
    producer_name: p.profiles?.name ?? "—",
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
    product_title: o.products?.title ?? "—",
  }));
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

export interface PlatformRevenue {
  salesFeesTotal: number;
  salesFeesMonth: number;
  withdrawalFeesTotal: number;
  withdrawalFeesMonth: number;
  totalRevenue: number;
  monthRevenue: number;
}

export async function getPlatformRevenue(): Promise<PlatformRevenue> {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: orders }, { data: withdrawals }] = await Promise.all([
    supabase.from("orders").select("platform_fee_amount, paid_at").eq("status", "paid").not("platform_fee_amount", "is", null),
    supabase.from("withdrawals").select("fee_amount, paid_at").in("status", ["paid", "confirmed"]),
  ]);

  let salesFeesTotal = 0;
  let salesFeesMonth = 0;
  for (const o of orders ?? []) {
    const fee = o.platform_fee_amount ?? 0;
    salesFeesTotal += fee;
    if (o.paid_at && new Date(o.paid_at) >= startOfMonth) salesFeesMonth += fee;
  }

  let withdrawalFeesTotal = 0;
  let withdrawalFeesMonth = 0;
  for (const w of withdrawals ?? []) {
    withdrawalFeesTotal += w.fee_amount;
    if (w.paid_at && new Date(w.paid_at) >= startOfMonth) withdrawalFeesMonth += w.fee_amount;
  }

  return {
    salesFeesTotal,
    salesFeesMonth,
    withdrawalFeesTotal,
    withdrawalFeesMonth,
    totalRevenue: salesFeesTotal + withdrawalFeesTotal,
    monthRevenue: salesFeesMonth + withdrawalFeesMonth,
  };
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
