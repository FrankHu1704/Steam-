"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSecret, generateClientCredentials, generateWebhookSecret } from "@/lib/api-auth";
import { getActivePaymentProvider, providerModule, type PaymentProviderName } from "@/lib/payments";
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
      .select("production_unlocked_at")
      .eq("id", user.id)
      .single();
    if (!profile?.production_unlocked_at) {
      return { error: "Desbloqueie o modo produção primeiro (300 MT, pagamento único)." };
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
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { unlocked: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("production_unlocked_at")
    .eq("id", user.id)
    .single();
  if (profile?.production_unlocked_at) return { unlocked: true };

  const { data: pending } = await supabase
    .from("production_unlocks")
    .select("id")
    .eq("producer_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { unlocked: false, pendingOrderId: pending?.id };
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
      customerName: profile?.name ?? "Produtor PagaJá",
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
