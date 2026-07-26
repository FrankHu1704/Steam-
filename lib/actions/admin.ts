"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import { sendProductApprovedEmail, sendBulkEmail } from "@/lib/email";
import { creditOrder } from "@/lib/order-fulfillment";
import { payWithdrawalB2C } from "@/lib/withdrawal-fulfillment";
import type { UserRole, WithdrawalStatus } from "@/types/database";

export async function approveProduct(productId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  await supabase
    .from("products")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: admin.user.id, rejection_reason: null })
    .eq("id", productId);

  const { data: product } = await supabase
    .from("products")
    .select("title, profiles!producer_id(email)")
    .eq("id", productId)
    .single<{ title: string; profiles: { email: string } | null }>();
  if (product?.profiles?.email) {
    await sendProductApprovedEmail({ producerEmail: product.profiles.email, productTitle: product.title });
  }

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

export async function payWithdrawalViaZumboPay(withdrawalId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  // Admin can trigger B2C straight from "pending" or "approved" — the
  // manual-approval gate is only meaningful for manual payouts, not for
  // an instant, auto-dispatched B2C transfer.
  const result = await payWithdrawalB2C(withdrawalId);
  if (!result.ok) return { error: result.error };
  return { ok: true, reference: result.reference };
}

export async function markProductionUnlockPaid(unlockId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: unlock } = await supabase.from("production_unlocks").select("*").eq("id", unlockId).single();
  if (!unlock) return { error: "Registo não encontrado." };
  if (unlock.status === "paid") return { error: "Este desbloqueio já está marcado como pago." };

  await supabase
    .from("production_unlocks")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", unlockId);
  await supabase
    .from("profiles")
    .update({ production_unlocked_at: new Date().toISOString() })
    .eq("id", unlock.producer_id);

  return { ok: true };
}

export async function markOrderPaid(orderId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status === "paid") return { error: "Este pedido já está marcado como pago." };

  await supabase
    .from("payments")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("order_id", orderId);
  await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", orderId);

  await creditOrder(orderId);

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

export async function sendBroadcastEmail(subject: string, message: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!subject.trim() || !message.trim()) return { error: "Preencha o assunto e a mensagem." };

  const supabase = createAdminClient();
  const { data: profiles } = await supabase.from("profiles").select("email");
  const recipients = (profiles ?? []).map((p) => p.email).filter(Boolean);

  if (recipients.length === 0) return { error: "Nenhum utilizador encontrado." };

  const { sent } = await sendBulkEmail(recipients, subject, message);
  if (sent === 0) return { error: "Falha ao enviar — verifique se RESEND_API_KEY está configurada." };

  return { ok: true, sent, total: recipients.length };
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
