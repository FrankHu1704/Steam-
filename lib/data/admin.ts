import { createClient } from "@/lib/supabase/server";
import type { Category, LogEntry, Order, Product, Profile, Setting, Withdrawal } from "@/types/database";

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
  return ((data ?? []) as (Order & { products: { title: string } | null })[]).map((o) => ({
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
