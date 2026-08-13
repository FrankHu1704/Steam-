"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, entre novamente." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) return { error: "O nome é obrigatório." };
  if (!phone) return { error: "O telefone é obrigatório para receber notificações de vendas." };

  const avatarFile = formData.get("avatar") as File | null;
  let avatar_url: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) {
      return { error: "A foto deve ter no máximo 5MB." };
    }
    const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
    if (uploadError) return { error: uploadError.message };
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    avatar_url = data.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name, phone, ...(avatar_url ? { avatar_url } : {}) })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account/profile");
  revalidatePath("/dashboard");
  return {};
}

export async function becomeProducer(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, entre novamente." };

  const { error } = await supabase
    .from("profiles")
    .update({ role: "producer", became_producer_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("role", "buyer");

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}
