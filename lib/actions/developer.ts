"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSecret, generateClientCredentials, generateWebhookSecret, issueAccessToken } from "@/lib/api-auth";
import { getActivePaymentProvider, providerModule, type PaymentProviderName } from "@/lib/payments";
import { hasActiveProductionAccess, canStartProductionTrial, PRODUCTION_TRIAL_HOURS } from "@/lib/production-access";
import type { ActionResult } from "@/lib/actions/auth";
import type { ApiKey, DeveloperWebhook, ApiKeyMode } from "@/types/database";

const PRODUCTION_UNLOCK_AMOUNT = 300;

export async function getApiKeys(): Promise<ApiKey[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function createApiKey(
  label: string,
  mode: ApiKeyMode
): Promise<ActionResult & { id?: string; clientId?: string; clientSecret?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  if (mode === "live") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("production_unlocked_at, production_access_expires_at")
      .eq("id", user.id)
      .single();
    if (!profile || !hasActiveProductionAccess(profile)) {
      return { error: "Desbloqueie o modo produção primeiro (300 MT, pagamento único, ou teste grátis de 24h)." };
    }
  }

  const { clientId, clientSecret } = generateClientCredentials(mode);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      producer_id: user.id,
      label: label.trim() || "Chave de API",
      client_id: clientId,
      client_secret_hash: hashSecret(clientSecret),
      mode,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Falha ao criar chave." };

  revalidatePath("/dashboard/developer");
  return { id: data.id as string, clientId, clientSecret };
}

export async function getProductionUnlockStatus(): Promise<{
  unlocked: boolean;
  pendingOrderId?: string;
  trialActive: boolean;
  trialExpiresAt?: string;
  trialExpired: boolean;
  canStartTrial: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { unlocked: false, trialActive: false, trialExpired: false, canStartTrial: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("production_unlocked_at, production_access_expires_at")
    .eq("id", user.id)
    .single();

  if (profile?.production_unlocked_at) {
    return { unlocked: true, trialActive: false, trialExpired: false, canStartTrial: false };
  }

  const trialActive = !!profile?.production_access_expires_at && hasActiveProductionAccess(profile);
  const trialExpired =
    !!profile?.production_access_expires_at && !trialActive && !profile?.production_unlocked_at;

  const { data: pending } = await supabase
    .from("production_unlocks")
    .select("id")
    .eq("producer_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    unlocked: false,
    pendingOrderId: pending?.id,
    trialActive,
    trialExpiresAt: profile?.production_access_expires_at ?? undefined,
    trialExpired,
    canStartTrial: profile ? canStartProductionTrial(profile) : false,
  };
}

// Free, one-time, 24h window to try live-mode API charges before
// committing to the permanent 300 MT unlock — no payment involved.
export async function startProductionTrial(): Promise<ActionResult & { expiresAt?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("production_unlocked_at, production_access_expires_at")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };
  if (!canStartProductionTrial(profile)) {
    return { error: "O teste grátis já foi usado ou o modo produção já está desbloqueado." };
  }

  const expiresAt = new Date(Date.now() + PRODUCTION_TRIAL_HOURS * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("profiles").update({ production_access_expires_at: expiresAt }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/developer");
  return { expiresAt };
}

export async function requestProductionUnlock(
  phone: string,
  paymentMethod: "mpesa" | "emola"
): Promise<ActionResult & { unlockId?: string; checkoutUrl?: string; status?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!phone.trim()) return { error: "Indique o número de telemóvel para o pagamento." };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.production_unlocked_at) return { error: "O modo produção já está desbloqueado." };

  const admin = createAdminClient();
  const providerName = await getActivePaymentProvider();

  const { data: unlock, error: unlockError } = await admin
    .from("production_unlocks")
    .insert({ producer_id: user.id, amount: PRODUCTION_UNLOCK_AMOUNT, currency: "MZN", provider: providerName, status: "pending" })
    .select("id")
    .single();
  if (unlockError || !unlock) return { error: unlockError?.message ?? "Falha ao iniciar o desbloqueio." };

  try {
    const charge = await providerModule(providerName).createCharge({
      paymentMethod,
      amount: PRODUCTION_UNLOCK_AMOUNT,
      currency: "MZN",
      sourceId: unlock.id,
      customerName: profile?.name ?? "Produtor PayNow",
      customerEmail: profile?.email ?? "",
      customerPhone: phone,
    });
    await admin.from("production_unlocks").update({ provider_payment_id: charge.payment_id }).eq("id", unlock.id);
    return { unlockId: unlock.id, checkoutUrl: charge.checkout_url ?? undefined, status: charge.status };
  } catch (err) {
    await admin.from("production_unlocks").update({ status: "failed" }).eq("id", unlock.id);
    return { error: (err as Error).message };
  }
}

export async function checkProductionUnlockStatus(unlockId: string): Promise<{ status: string }> {
  const admin = createAdminClient();
  const { data: unlock } = await admin.from("production_unlocks").select("*").eq("id", unlockId).single();
  if (!unlock) return { status: "failed" };
  if (unlock.status !== "pending") return { status: unlock.status };

  if (unlock.provider_payment_id) {
    try {
      const providerName: PaymentProviderName =
        unlock.provider === "zumbopay" || unlock.provider === "netshop" ? unlock.provider : "debito_pay";
      const remote = await providerModule(providerName).checkChargeStatus(unlock.provider_payment_id);
      if (remote.status === "success") {
        await admin
          .from("production_unlocks")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", unlockId);
        await admin
          .from("profiles")
          .update({ production_unlocked_at: new Date().toISOString() })
          .eq("id", unlock.producer_id);
        return { status: "paid" };
      }
      if (remote.status === "failed") {
        await admin.from("production_unlocks").update({ status: "failed" }).eq("id", unlockId);
        return { status: "failed" };
      }
    } catch {
      // best-effort reconciliation; webhook remains the source of truth
    }
  }
  return { status: "pending" };
}

// Lets a producer get an access_token straight from the dashboard, without
// needing to run a curl command themselves — same credential exchange as
// POST /api/v1/oauth/token, just called directly instead of over HTTP.
export async function getAccessToken(
  clientId: string,
  clientSecret: string
): Promise<ActionResult & { accessToken?: string; expiresIn?: number }> {
  if (!clientId.trim() || !clientSecret.trim()) {
    return { error: "client_id e client_secret são obrigatórios." };
  }

  const admin = createAdminClient();
  const { data: apiKey } = await admin
    .from("api_keys")
    .select("*")
    .eq("client_id", clientId.trim())
    .is("revoked_at", null)
    .single();

  if (!apiKey) return { error: "Credenciais inválidas." };

  const providedHash = hashSecret(clientSecret.trim());
  let matches = false;
  try {
    matches = crypto.timingSafeEqual(Buffer.from(apiKey.client_secret_hash), Buffer.from(providedHash));
  } catch {
    matches = false;
  }
  if (!matches) return { error: "Credenciais inválidas." };

  const { token, expiresIn } = await issueAccessToken(apiKey.id, apiKey.producer_id);
  return { accessToken: token, expiresIn };
}

export async function revokeApiKey(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/developer");
  return {};
}

export async function getDeveloperWebhook(): Promise<DeveloperWebhook | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("developer_webhooks").select("*").single();
  return data ?? null;
}

export async function saveDeveloperWebhook(
  url: string,
  events: string[]
): Promise<ActionResult & { secret?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  if (!/^https:\/\//.test(url.trim())) {
    return { error: "O URL deve começar com https://." };
  }

  const secret = generateWebhookSecret();
  const { error } = await supabase.from("developer_webhooks").upsert(
    {
      producer_id: user.id,
      url: url.trim(),
      events: events.length > 0 ? events : ["payment.completed"],
      secret,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "producer_id" }
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/developer");
  return { secret };
}

export async function deleteDeveloperWebhook(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("developer_webhooks").delete().eq("producer_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/developer");
  return {};
}
