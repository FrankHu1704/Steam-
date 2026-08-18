"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, requireProductModerator } from "@/lib/data/admin";
import { sendProductApprovedEmail, sendProductRejectedEmail, sendProductDeletedEmail, sendAdminMessageEmail, sendBulkEmail, sendWithdrawalRequestedEmail, sendInstantWithdrawalAnnouncementEmail, sendAccountReinstatedEmail, sendProducerWelcomeEmail, sendProducerApplicationRejectedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { creditOrder, notifyProducerOfFailedPayment, refundOrder } from "@/lib/order-fulfillment";
import { payWithdrawalB2C } from "@/lib/withdrawal-fulfillment";
import { getActivePaymentProvider, providerModule, b2cMethodsForProvider } from "@/lib/payments";
import type { UserRole, WithdrawalStatus } from "@/types/database";

export async function approveProduct(productId: string) {
  const admin = await requireProductModerator();
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
  const admin = await requireProductModerator();
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

    const walletField =
      withdrawal.wallet_source === "dev"
        ? "balance_available_dev"
        : withdrawal.wallet_source === "cto"
          ? "balance_available_cto"
          : "balance_available";
    const { data: producer } = await supabase
      .from("profiles")
      .select("balance_available, balance_available_dev, balance_available_cto")
      .eq("id", withdrawal.producer_id)
      .single();
    await supabase
      .from("profiles")
      .update({ [walletField]: (producer?.[walletField] ?? 0) + withdrawal.amount })
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
    notes: input.note || `Pagamento manual PayNow (admin)`,
    autoDispatch: true,
  });

  const supabase = createAdminClient();
  // Logged under the same action as payWithdrawalB2C's attempts so both
  // show up together in the admin "Histórico de B2C" — the `manual` flag
  // and `destination`/`note` fields distinguish this ad-hoc payout (no
  // withdrawal request behind it) from a producer's own levantamento.
  await supabase.from("logs").insert({
    action: "b2c_payout_attempt",
    metadata: {
      admin_id: admin.user.id,
      manual: true,
      destination: input.destination,
      note: input.note ?? null,
      amount: input.amount,
      net_amount: input.amount,
      currency: "MZN",
      payout_method: input.method,
      provider: providerName,
      success: result.success && result.status === "success",
      error: result.success ? null : result.error ?? null,
      reference: result.providerReference ?? result.reference ?? null,
    },
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

// A product with any order history (even a failed/pending attempt) can't
// be hard-deleted — orders.product_id has no ON DELETE CASCADE, so the
// database itself would reject it, and cascading the delete would erase
// real sales/financial records. Pausing is the safe admin equivalent:
// takes the product off checkout immediately (same effect a producer gets
// from their own "Pausar" button in lib/actions/products.ts) without
// touching any order data — the only way to shut down a live product once
// it already has sales, e.g. right after suspending its producer's
// account and they can no longer pause it themselves.
export async function adminSetProductStatus(productId: string, status: "approved" | "paused") {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", productId)
    .in("status", ["approved", "paused"]);
  if (error) return { error: error.message };
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

// Passwords are hashed by Supabase Auth and never recoverable — this is the
// only legitimate way for an admin to help a locked-out user: set a brand
// new password directly, without ever seeing/needing the old one.
export async function adminResetUserPassword(userId: string, newPassword: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (newPassword.length < 8) return { error: "A nova senha deve ter pelo menos 8 caracteres." };

  const supabase = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("email, name").eq("id", userId).single();
  if (!profile) return { error: "Utilizador não encontrado." };

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };

  await supabase.from("logs").insert({
    actor_id: admin.user.id,
    action: "admin_reset_password",
    target_table: "profiles",
    target_id: userId,
  });

  if (profile.email) {
    await sendAdminMessageEmail({
      to: profile.email,
      subject: "A sua senha foi redefinida",
      message:
        "A sua senha na PayNow foi redefinida por um administrador.\n\nSe pediu esta alteração, já pode entrar com a nova senha. Se não pediu, contacte-nos imediatamente respondendo a este email.",
    });
  }

  return { ok: true };
}

// Lets an admin grant a producer live-mode API access directly — for a
// chosen period, or permanently — without them paying the 300 MT unlock
// or using their one-time free 24h trial. durationHours=null means
// permanent; a temporary grant only ever extends production_access_expires_at,
// never touching production_unlocked_at (so it can't accidentally downgrade
// someone who already has permanent access).
export async function adminGrantProductionAccess(userId: string, durationHours: number | null) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const updates =
    durationHours == null
      ? { production_unlocked_at: new Date().toISOString(), production_access_expires_at: null }
      : { production_access_expires_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() };

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) return { error: error.message };

  await supabase.from("logs").insert({
    actor_id: admin.user.id,
    action: "admin_grant_production_access",
    target_table: "profiles",
    target_id: userId,
    metadata: { duration_hours: durationHours },
  });

  return { ok: true };
}

export async function adminRevokeProductionAccess(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ production_unlocked_at: null, production_access_expires_at: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  await supabase.from("logs").insert({
    actor_id: admin.user.id,
    action: "admin_revoke_production_access",
    target_table: "profiles",
    target_id: userId,
  });

  return { ok: true };
}

// Called from app/dashboard/layout.tsx (a Server Component, not a client
// form) the first time a buyer account requests to become a producer —
// tells every admin there's a new request waiting in Admin -> Utilizadores.
export async function notifyAdminsOfPendingProducer(userId: string, name: string, email: string) {
  const supabase = createAdminClient();
  const { data: admins } = await supabase.from("profiles").select("id, email").eq("role", "admin");
  for (const adminProfile of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: adminProfile.id,
      type: "producer_request",
      title: "Novo pedido de conta de produtor",
      message: `${name} (${email}) pediu para vender na PayNow — precisa da sua aprovação.`,
    });
    await sendPushToUser(adminProfile.id, {
      title: "Novo pedido de produtor ⏳",
      body: name,
      url: `/admin/users/${userId}`,
    });
  }
}

// Approving/rejecting a pending producer request — see
// app/dashboard/layout.tsx, which sets producer_status="pending" (role
// stays "buyer") the first time an account tries to reach the dashboard,
// instead of promoting it to producer instantly. Anti-fraud measure: an
// admin has to look at the account before it can list products or
// receive payments.
export async function approveProducerAccount(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("name, email, role, producer_status")
    .eq("id", userId)
    .single();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.role !== "buyer" || target.producer_status !== "pending") {
    return { error: "Este pedido já foi avaliado." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: "producer",
      producer_status: "approved",
      producer_rejection_reason: null,
      became_producer_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  if (target.email) {
    await sendProducerWelcomeEmail({ email: target.email, name: target.name });
  }

  return { ok: true };
}

export async function rejectProducerAccount(userId: string, reason: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!reason.trim()) return { error: "Indique o motivo da rejeição." };

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("name, email, role, producer_status")
    .eq("id", userId)
    .single();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.role !== "buyer" || target.producer_status !== "pending") {
    return { error: "Este pedido já foi avaliado." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ producer_status: "rejected", producer_rejection_reason: reason.trim() })
    .eq("id", userId);
  if (error) return { error: error.message };

  if (target.email) {
    await sendProducerApplicationRejectedEmail({ email: target.email, name: target.name, reason: reason.trim() });
  }

  return { ok: true };
}

const KYC_SIGNED_URL_TTL_SECONDS = 60 * 10; // short-lived — only needed for the admin to view once while reviewing

// Documents are only ever exposed through these short-lived signed URLs,
// minted with the service-role client — the storage bucket itself has no
// policy granting admins direct read access (see 0060_kyc_verification.sql).
export async function getKycDocumentUrls(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("kyc_document_front_path, kyc_document_back_path")
    .eq("id", userId)
    .single();
  if (!target?.kyc_document_front_path || !target?.kyc_document_back_path) {
    return { error: "Documentos não encontrados." };
  }

  const [front, back] = await Promise.all([
    supabase.storage.from("kyc-documents").createSignedUrl(target.kyc_document_front_path, KYC_SIGNED_URL_TTL_SECONDS),
    supabase.storage.from("kyc-documents").createSignedUrl(target.kyc_document_back_path, KYC_SIGNED_URL_TTL_SECONDS),
  ]);

  return { frontUrl: front.data?.signedUrl ?? null, backUrl: back.data?.signedUrl ?? null };
}

export async function approveKycSubmission(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("profiles").select("kyc_status").eq("id", userId).single();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.kyc_status !== "pending") return { error: "Este pedido já foi avaliado." };

  const { error } = await supabase
    .from("profiles")
    .update({
      kyc_status: "approved",
      kyc_reviewed_at: new Date().toISOString(),
      kyc_reviewed_by: admin.user.id,
      kyc_rejection_reason: null,
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  await sendPushToUser(userId, {
    title: "Verificação aprovada ✅",
    body: "A tua identidade foi verificada. Já podes solicitar saques.",
    url: "/dashboard/withdrawals",
  });

  return { ok: true };
}

export async function rejectKycSubmission(userId: string, reason: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!reason.trim()) return { error: "Indique o motivo da rejeição." };

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("profiles").select("kyc_status").eq("id", userId).single();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.kyc_status !== "pending") return { error: "Este pedido já foi avaliado." };

  const { error } = await supabase
    .from("profiles")
    .update({ kyc_status: "rejected", kyc_reviewed_at: new Date().toISOString(), kyc_reviewed_by: admin.user.id, kyc_rejection_reason: reason.trim() })
    .eq("id", userId);
  if (error) return { error: error.message };

  await sendPushToUser(userId, {
    title: "Verificação rejeitada",
    body: `A tua verificação de identidade foi rejeitada: ${reason.trim()}`,
    url: "/dashboard/verificacao",
  });

  return { ok: true };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  return { ok: true };
}

// CTO is an overlay on a producer account (they keep selling/earning as a
// normal producer) — this just grants/revokes product-moderation access
// and the monthly 25%-of-profit share, never touches profiles.role.
export async function setCtoStatus(userId: string, isCto: boolean) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (!target || target.role !== "producer") return { error: "Só um produtor pode ser CTO." };

  const { error } = await supabase.from("profiles").update({ is_cto: isCto }).eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

// Sponsor: unlike CTO, any account can be one (buyer or producer — a
// sponsor doesn't need to sell anything) and each sponsor has their own
// admin-defined share percentage instead of a fixed platform-wide rate.
// contractStartedAt is the clock creditMonthlySponsorShare() (lib/
// sponsor.ts) uses — profit generated before it never counts, even
// retroactively within the same month. Passing isSponsor=false clears the
// percentage/date too, so re-enabling later always starts from a clean
// contract rather than reusing stale values.
export async function setSponsorStatus(
  userId: string,
  isSponsor: boolean,
  sharePercent: number | null,
  contractStartedAt: string | null
) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  if (isSponsor) {
    if (!sharePercent || sharePercent <= 0 || sharePercent > 100) {
      return { error: "Indique uma percentagem válida (entre 0 e 100)." };
    }
    if (!contractStartedAt) return { error: "Indique a data de início do contrato." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_sponsor: isSponsor,
      sponsor_share_percent: isSponsor ? sharePercent : null,
      sponsor_contract_started_at: isSponsor ? contractStartedAt : null,
    })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

const BALANCE_FIELD_LABEL: Record<"producer" | "dev" | "cto" | "sponsor", string> = {
  producer: "Carteira Produtor",
  dev: "Carteira Programador (API)",
  cto: "Carteira CTO",
  sponsor: "Carteira Patrocinador",
};

// Manual correction tool — e.g. fixing a support case, crediting a
// goodwill adjustment, or clawing back a wrongly-credited sale that
// wasn't caught by the normal refund flow. `amount` is a signed delta
// (positive credits, negative debits) applied directly to the chosen
// wallet; the resulting balance is allowed to go negative (same as a
// refund clawback already can — see the negative-balance banner in
// /dashboard/withdrawals), it's just deducted from future sales like any
// other negative balance. Every adjustment is logged with a required
// reason and notifies the producer, since this moves real money without
// an order or withdrawal behind it.
export async function adminAdjustBalance(
  userId: string,
  wallet: "producer" | "dev" | "cto" | "sponsor",
  amount: number,
  reason: string
) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (!Number.isFinite(amount) || amount === 0) return { error: "Indique um valor válido (positivo para adicionar, negativo para retirar)." };
  if (!reason.trim()) return { error: "Indique o motivo do ajuste para o registo." };

  const walletField =
    wallet === "dev"
      ? "balance_available_dev"
      : wallet === "cto"
        ? "balance_available_cto"
        : wallet === "sponsor"
          ? "balance_available_sponsor"
          : "balance_available";

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select(`name, email, currency, ${walletField}`)
    .eq("id", userId)
    .single<{ name: string; email: string; currency: string } & Record<string, number>>();
  if (!target) return { error: "Utilizador não encontrado." };

  const before = target[walletField];
  const after = Math.round((before + amount) * 100) / 100;

  const { error } = await supabase.from("profiles").update({ [walletField]: after }).eq("id", userId);
  if (error) return { error: error.message };

  await supabase.from("logs").insert({
    actor_id: admin.user.id,
    action: "admin_balance_adjustment",
    target_table: "profiles",
    target_id: userId,
    metadata: { wallet, amount, before, after, currency: target.currency, reason: reason.trim() },
  });

  const verb = amount > 0 ? "creditou" : "debitou";
  const absAmount = Math.abs(amount);
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "admin_message",
    title: amount > 0 ? "Saldo creditado pelo admin" : "Saldo ajustado pelo admin",
    message: `Um administrador ${verb} ${absAmount.toLocaleString("pt-MZ")} ${target.currency} na sua ${BALANCE_FIELD_LABEL[wallet]}. Motivo: ${reason.trim()}`,
  });
  await sendPushToUser(userId, {
    title: amount > 0 ? "Saldo creditado" : "Saldo ajustado",
    body: `${amount > 0 ? "+" : "-"}${absAmount.toLocaleString("pt-MZ")} ${target.currency} — ${BALANCE_FIELD_LABEL[wallet]}`,
    url: "/dashboard/withdrawals",
  });
  if (target.email) {
    await sendAdminMessageEmail({
      to: target.email,
      subject: amount > 0 ? "Saldo creditado na sua conta PayNow" : "Saldo ajustado na sua conta PayNow",
      message: `Um administrador ${verb} ${absAmount.toLocaleString("pt-MZ")} ${target.currency} na sua ${BALANCE_FIELD_LABEL[wallet]}.\n\nMotivo: ${reason.trim()}\n\nSaldo anterior: ${before.toLocaleString("pt-MZ")} ${target.currency}\nSaldo atual: ${after.toLocaleString("pt-MZ")} ${target.currency}`,
    });
  }

  return { ok: true, before, after };
}

// Suspends a user's access without touching their balance, products, or
// order history — signIn() rejects the login outright, and
// getCurrentUserAndProfile() signs out any session already active for
// this account the next time it loads a protected page (see
// lib/data/profile.ts). Admins can't suspend themselves or another admin,
// to avoid a mistaken click locking every admin out at once.
//
// Deliberately silent: the account gets NO email/push/in-app notice that
// it was suspended — signIn() and getCurrentUserAndProfile() both make it
// look like the account simply doesn't exist (same as a wrong password),
// rather than confirming to whoever's behind it that they've been caught.
export async function suspendUser(userId: string, reason: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (userId === admin.user.id) return { error: "Não pode suspender a sua própria conta." };

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.role === "admin") return { error: "Não é possível suspender outra conta de administrador." };

  const { error } = await supabase
    .from("profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspension_reason: reason.trim() || null,
      suspended_by: admin.user.id,
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  return { ok: true };
}

// Stronger than suspendUser() — used when the admin has actually
// identified fraud/a scam, not just a policy violation worth pausing. On
// top of the same login block, this permanently forfeits every wallet the
// account holds (producer/API/CTO) — set to 0 and never restored, per
// PayNow's no-refund-on-fraud policy — and sets fraud_flag, which stays
// true forever (even across a later unsuspendUser()) as a historical
// record for reporting. Reactivation (restoring login access, never the
// balance) still goes through the same unsuspendUser() as a plain
// suspension. Same silence policy as suspendUser() — no email/push/in-app
// notice, so nothing tips off whoever's behind the account.
export async function markUserAsFraud(userId: string, reason: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };
  if (userId === admin.user.id) return { error: "Não pode marcar a sua própria conta." };
  if (!reason.trim()) return { error: "Indique o motivo da fraude para o registo." };

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("role, currency, balance_available, balance_available_dev, balance_available_cto")
    .eq("id", userId)
    .single();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.role === "admin") return { error: "Não é possível marcar outra conta de administrador." };

  const forfeitedAmount =
    Math.max(0, target.balance_available) +
    Math.max(0, target.balance_available_dev) +
    Math.max(0, target.balance_available_cto);

  const { error } = await supabase
    .from("profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspension_reason: reason.trim(),
      suspended_by: admin.user.id,
      fraud_flag: true,
      balance_available: 0,
      balance_available_dev: 0,
      balance_available_cto: 0,
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  await supabase.from("logs").insert({
    action: "user_marked_fraud",
    target_table: "profiles",
    target_id: userId,
    metadata: {
      admin_id: admin.user.id,
      reason: reason.trim(),
      forfeited_amount: forfeitedAmount,
      currency: target.currency,
      forfeited_breakdown: {
        producer: target.balance_available,
        dev: target.balance_available_dev,
        cto: target.balance_available_cto,
      },
    },
  });

  return { ok: true };
}

export async function unsuspendUser(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("profiles").select("name, email").eq("id", userId).single();
  if (!target) return { error: "Utilizador não encontrado." };

  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: null, suspension_reason: null, suspended_by: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  if (target.email) {
    await sendAccountReinstatedEmail({ to: target.email, name: target.name });
  }

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

// "Contas sem produtos ou vendas" — lifetime_sales_count already tracks
// every paid sale a producer has ever had (incremented in creditOrder), so
// zero there covers both "never created a product" and "created one but
// never sold" in a single check.
export async function getInactiveProducersCount(): Promise<number> {
  const admin = await requireAdminUser();
  if (!admin) return 0;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "producer")
    .eq("lifetime_sales_count", 0);

  return count ?? 0;
}

export async function sendInstantWithdrawalAnnouncementToInactiveProducers(): Promise<{
  ok?: boolean;
  error?: string;
  sent?: number;
}> {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: producers } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("role", "producer")
    .eq("lifetime_sales_count", 0);

  if (!producers || producers.length === 0) return { error: "Nenhuma conta sem vendas encontrada." };

  let sent = 0;
  for (const producer of producers) {
    if (!producer.email) continue;
    await sendInstantWithdrawalAnnouncementEmail({ producerEmail: producer.email, producerName: producer.name });
    sent += 1;
  }

  return { ok: true, sent };
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

export async function markPrizeDelivered(producerId: string, tierKey: string, notes?: string) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("producer_prize_deliveries").insert({
    producer_id: producerId,
    tier_key: tierKey,
    delivered_by: admin.user.id,
    notes: notes?.trim() || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
