"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import { sendProductApprovedEmail, sendProductRejectedEmail, sendProductDeletedEmail, sendAdminMessageEmail, sendBulkEmail, sendWithdrawalRequestedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { creditOrder, notifyProducerOfFailedPayment, refundOrder } from "@/lib/order-fulfillment";
import { payWithdrawalB2C } from "@/lib/withdrawal-fulfillment";
import { getActivePaymentProvider, providerModule, b2cMethodsForProvider } from "@/lib/payments";
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
    .select("title, slug, profiles!producer_id(name, email)")
    .eq("id", productId)
    .single<{ title: string; slug: string; profiles: { name: string; email: string } | null }>();
  if (product?.profiles?.email) {
    await sendProductApprovedEmail({
      producerEmail: product.profiles.email,
      producerName: product.profiles.name,
      productTitle: product.title,
      productSlug: product.slug,
    });
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

  const { data: product } = await supabase
    .from("products")
    .select("title, profiles!producer_id(name, email)")
    .eq("id", productId)
    .single<{ title: string; profiles: { name: string; email: string } | null }>();
  if (product?.profiles?.email) {
    await sendProductRejectedEmail({
      producerEmail: product.profiles.email,
      producerName: product.profiles.name,
      productTitle: product.title,
      reason,
    });
  }

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

  if (status === "paid") {
    const { data: producer } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", withdrawal.producer_id)
      .single();
    if (producer?.email) {
      await sendWithdrawalRequestedEmail({
        producerEmail: producer.email,
        producerName: producer.name,
        amount: withdrawal.amount,
        netAmount: withdrawal.net_amount,
        currency: withdrawal.currency,
        payoutMethod: withdrawal.payout_method,
        destination: withdrawal.destination,
        instant: true,
      });
    }
  }

  return { ok: true };
}

export async function sendManualB2CPayout(input: {
  method: "mpesa" | "emola";
  destination: string;
  amount: number;
  note?: string;
}) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!input.destination.trim() || !(input.amount > 0)) {
    return { error: "Destino e valor válido são obrigatórios." };
  }

  const providerName = await getActivePaymentProvider();
  const allowedMethods = b2cMethodsForProvider(providerName);
  if (!(allowedMethods as readonly string[]).includes(input.method)) {
    return { error: `Pagamento instantâneo via B2C não suporta ${input.method} no processador ativo.` };
  }

  const result = await providerModule(providerName).createPayout({
    method: input.method,
    amount: input.amount,
    destination: input.destination,
    notes: input.note || `Pagamento manual PagaJá (admin)`,
    autoDispatch: true,
  });

  const supabase = createAdminClient();
  await supabase.from("logs").insert({
    action: "admin_manual_b2c",
    metadata: { admin_id: admin.user.id, provider: providerName, ...input, result },
  });

  if (!result.success || result.status !== "success") {
    return { error: result.error ?? "Pagamento não confirmado pelo processador." };
  }

  return { ok: true, reference: result.providerReference ?? result.reference };
}

export async function payWithdrawalViaB2C(withdrawalId: string) {
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

export async function markOrderFailed(orderId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status === "paid") return { error: "Este pedido já está marcado como pago." };

  await supabase
    .from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("order_id", orderId);
  await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);

  await notifyProducerOfFailedPayment(orderId);

  return { ok: true };
}

export async function markOrderRefunded(orderId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("id, status").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status === "refunded") return { error: "Este pedido já está marcado como reembolsado." };

  await refundOrder(orderId);

  return { ok: true };
}

export async function adminDeleteProduct(productId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, profiles!producer_id(name, email)")
    .eq("id", productId)
    .single<{ title: string; profiles: { name: string; email: string } | null }>();
  if (!product) return { error: "Produto não encontrado." };

  const { count: ordersCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if ((ordersCount ?? 0) > 0) {
    return { error: "Este produto já tem pedidos associados (mesmo falhados ou pendentes) e não pode ser apagado — peça ao produtor para pausá-lo." };
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };

  if (product.profiles?.email) {
    await sendProductDeletedEmail({
      producerEmail: product.profiles.email,
      producerName: product.profiles.name,
      productTitle: product.title,
    });
  }

  return { ok: true };
}

export async function sendPrivateMessage(userId: string, subject: string, message: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!subject.trim() || !message.trim()) return { error: "Preencha o assunto e a mensagem." };

  const supabase = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
  if (!profile) return { error: "Utilizador não encontrado." };

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "admin_message",
    title: subject,
    message,
  });

  await sendPushToUser(userId, { title: subject, body: message.slice(0, 120), url: "/dashboard" });

  if (profile.email) {
    await sendAdminMessageEmail({ to: profile.email, subject, message });
  }

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
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { error: error.message };
  return { ok: true };
}
