"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import type { ActionResult } from "@/lib/actions/auth";

const MAX_MESSAGE_LENGTH = 500;

export async function sendChatMessage(message: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Escreva uma mensagem." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { error: `Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres).` };
  }

  const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", user.id).single();
  if (!profile) return { error: "Perfil não encontrado." };
  if (profile.role !== "producer" && profile.role !== "admin") {
    return { error: "O chat é exclusivo para produtores." };
  }

  const { error } = await supabase.from("community_chat_messages").insert({
    user_id: user.id,
    user_name: profile.name,
    user_role: profile.role,
    message: trimmed,
  });
  if (error) return { error: error.message };
  return {};
}

export async function deleteChatMessage(messageId: string): Promise<ActionResult> {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("community_chat_messages").delete().eq("id", messageId);
  if (error) return { error: error.message };
  return {};
}
