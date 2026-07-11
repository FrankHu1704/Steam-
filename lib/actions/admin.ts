"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import type { UserRole, WithdrawalStatus } from "@/types/database";

export async function approveProduct(productId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  await supabase
    .from("products")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: admin.user.id, rejection_reason: null })
    .eq("id", productId);
  return { ok: true };
}

export async function rejectProduct(productId: string, reason: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  await supabase
    .from("products")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: admin.user.id, rejection_reason: reason })
    .eq("id", productId);
  return { ok: true };
}

export async function updateWithdrawalStatus(withdrawalId: string, status: WithdrawalStatus, note?: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: withdrawal } = await supabase.from("withdrawals").select("*").eq("id", withdrawalId).single();
  if (!withdrawal) return { error: "Levantamento não encontrado." };

  const updates: Record<string, unknown> = { status };
  if (status === "approved") updates.reviewed_at = new Date().toISOString();
  if (status === "rejected") {
    updates.reviewed_at = new Date().toISOString();
    updates.rejection_reason = note ?? null;

    const { data: producer } = await supabase
      .from("profiles")
      .select("balance_available")
      .eq("id", withdrawal.producer_id)
      .single();
    await supabase
      .from("profiles")
      .update({ balance_available: (producer?.balance_available ?? 0) + withdrawal.amount })
      .eq("id", withdrawal.producer_id);
  }
  if (status === "paid") {
    updates.paid_at = new Date().toISOString();
    updates.payout_reference = note ?? null;
  }

  await supabase.from("withdrawals").update(updates).eq("id", withdrawalId);
  return { ok: true };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  return { ok: true };
}

export async function createCategory(name: string, slug: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!name.trim() || !slug.trim()) return { error: "Nome e slug são obrigatórios." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("categories").insert({ name, slug });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteCategory(categoryId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateSetting(key: string, value: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return { error: error.message };
  return { ok: true };
}
