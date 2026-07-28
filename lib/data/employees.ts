import { createAdminClient } from "@/lib/supabase/admin";
import type { Employee, EmployeeApplication } from "@/types/database";

export async function getEmployeeByUserId(userId: string): Promise<Employee | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("employees").select("*").eq("user_id", userId).maybeSingle();
  return (data as Employee) ?? null;
}

export interface EmployeeCommissionRow {
  id: string;
  amount: number;
  createdAt: string;
  productTitle: string;
  producerName: string;
}

export interface EmployeeOverview {
  clicksCount: number;
  registeredCount: number;
  producingCount: number;
  totalEarned: number;
  recentCommissions: EmployeeCommissionRow[];
}

export async function getEmployeeOverview(employeeId: string): Promise<EmployeeOverview> {
  const supabase = createAdminClient();

  const [{ count: clicksCount }, { data: recruits }, { data: commissions }] = await Promise.all([
    supabase.from("employee_link_clicks").select("id", { count: "exact", head: true }).eq("employee_id", employeeId),
    supabase.from("profiles").select("id").eq("recruited_by_employee_id", employeeId),
    supabase
      .from("employee_commissions")
      .select("id, amount, created_at, orders(product_id, products(title)), producer_id, profiles!producer_id(name)")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const recruitIds = (recruits ?? []).map((r) => r.id as string);

  let producingCount = 0;
  if (recruitIds.length > 0) {
    const { data: producingProfiles } = await supabase
      .from("products")
      .select("producer_id")
      .in("producer_id", recruitIds)
      .eq("status", "approved");
    producingCount = new Set((producingProfiles ?? []).map((p) => p.producer_id as string)).size;
  }

  type CommissionRow = {
    id: string;
    amount: number;
    created_at: string;
    orders: { product_id: string; products: { title: string } | null } | null;
    profiles: { name: string } | null;
  };

  const recentCommissions: EmployeeCommissionRow[] = ((commissions ?? []) as unknown as CommissionRow[]).map((c) => ({
    id: c.id,
    amount: c.amount,
    createdAt: c.created_at,
    productTitle: c.orders?.products?.title ?? "Produto",
    producerName: c.profiles?.name ?? "Produtor",
  }));

  const totalEarned = recentCommissions.reduce((sum, c) => sum + c.amount, 0);

  return {
    clicksCount: clicksCount ?? 0,
    registeredCount: recruitIds.length,
    producingCount,
    totalEarned,
    recentCommissions,
  };
}

export interface AdminEmployeeRow extends Employee {
  registeredCount: number;
}

export async function getAllEmployees(): Promise<AdminEmployeeRow[]> {
  const supabase = createAdminClient();
  const { data: employees } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
  if (!employees?.length) return [];

  const { data: recruits } = await supabase
    .from("profiles")
    .select("recruited_by_employee_id")
    .not("recruited_by_employee_id", "is", null);

  const countByEmployee = new Map<string, number>();
  for (const r of recruits ?? []) {
    const id = r.recruited_by_employee_id as string;
    countByEmployee.set(id, (countByEmployee.get(id) ?? 0) + 1);
  }

  return (employees as Employee[]).map((e) => ({ ...e, registeredCount: countByEmployee.get(e.id) ?? 0 }));
}

export async function getPendingEmployeeApplications(): Promise<EmployeeApplication[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("employee_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return (data as EmployeeApplication[]) ?? [];
}
