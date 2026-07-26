"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashSecret, generateClientCredentials, generateWebhookSecret } from "@/lib/api-auth";
import type { ActionResult } from "@/lib/actions/auth";
import type { ApiKey, DeveloperWebhook } from "@/types/database";

export async function getApiKeys(): Promise<ApiKey[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function createApiKey(
  label: string
): Promise<ActionResult & { id?: string; clientId?: string; clientSecret?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { clientId, clientSecret } = generateClientCredentials();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      producer_id: user.id,
      label: label.trim() || "Chave de API",
      client_id: clientId,
      client_secret_hash: hashSecret(clientSecret),
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Falha ao criar chave." };

  revalidatePath("/dashboard/developer");
  return { id: data.id as string, clientId, clientSecret };
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
