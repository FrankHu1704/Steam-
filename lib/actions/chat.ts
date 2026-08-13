"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import { sendPushToUser } from "@/lib/push";
import { chatCompletion, LUNA_CHAT_NAME, type ChatMessage } from "@/lib/groq";
import type { ActionResult } from "@/lib/actions/auth";

const MAX_MESSAGE_LENGTH = 500;
const NOTIFICATION_PREVIEW_LENGTH = 80;
const LUNA_MENTION = /@luna(ai| ai)?\b/i;

const LUNA_CHAT_SYSTEM_PROMPT = `Você é a LunaAI, participando do chat da comunidade de produtores da PayNow (plataforma moçambicana de venda de infoprodutos digitais). Foi mencionada com "@LunaAI" numa conversa em grupo entre vários produtores e admins — não é um chat privado.

Tom: descontraído, simpático, como mais uma pessoa do grupo — pode brincar, usar emojis com moderação, e não precisa de ser formal. Mas continua útil: se alguém fizer uma pergunta real sobre a plataforma, responde com informação certa.

O que sabe sobre a PayNow:
- Saldo e saques: em "Financeiro"/"Saques" — carteira M-Pesa/e-Mola, levantamento normalmente instantâneo (B2C automático) ou até 48h se manual.
- Publicar produto: "Produtos" → "Novo Produto" (completo, com categoria) ou "Link de Pagamento" (rápido, sem categoria, não aparece no marketplace). Fica pendente até um admin aprovar.
- Afiliados, indicações, premiações por metas de faturamento, 2FA em Definições, LunaAI a ajudar a escrever descrições de produtos.
- Pagamentos: M-Pesa e e-Mola sempre; cartão/PayPal internacional em breve.

Responde em português, no máximo 60 palavras, sem markdown (sem ** ou #). Se não souber algo com confiança, diz isso em vez de inventar.`;

// Best-effort: posts LunaAI's own reply as a second chat message when
// mentioned. Never throws — a failure here must never break the sender's
// own message, which is already saved by the time this runs.
async function maybeReplyAsLuna(triggerMessage: string): Promise<void> {
  if (!LUNA_MENTION.test(triggerMessage)) return;

  try {
    const admin = createAdminClient();
    const { data: recent } = await admin
      .from("community_chat_messages")
      .select("user_name, user_role, message")
      .order("created_at", { ascending: false })
      .limit(12);

    const history: ChatMessage[] = (recent ?? [])
      .reverse()
      .map((m) => ({
        role: m.user_role === "bot" ? "assistant" : "user",
        content: m.user_role === "bot" ? m.message : `${m.user_name}: ${m.message}`,
      }));

    const messages: ChatMessage[] = [{ role: "system", content: LUNA_CHAT_SYSTEM_PROMPT }, ...history];

    const result = await chatCompletion(messages, { maxTokens: 150, temperature: 0.8 });
    if (result.error || !result.text) return;

    await admin.from("community_chat_messages").insert({
      user_id: null,
      user_name: LUNA_CHAT_NAME,
      user_role: "bot",
      message: result.text,
    });
  } catch {
    // Best-effort only — see comment above.
  }
}

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

  // Best-effort: let every other chat participant (producer/admin) know a
  // new message arrived, with the sender's name, so they don't need to
  // have the chat open to notice activity.
  const admin = createAdminClient();
  const preview =
    trimmed.length > NOTIFICATION_PREVIEW_LENGTH ? `${trimmed.slice(0, NOTIFICATION_PREVIEW_LENGTH)}…` : trimmed;
  const { data: recipients } = await admin
    .from("profiles")
    .select("id, name, role")
    .in("role", ["producer", "admin"])
    .neq("id", user.id);

  for (const recipient of recipients ?? []) {
    // "@Full Name" in the message text — matched against the recipient's
    // own name — gets a distinct, more attention-grabbing notification.
    const mentioned = new RegExp(`@${recipient.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`).test(trimmed);
    await admin.from("notifications").insert({
      user_id: recipient.id,
      type: mentioned ? "chat_mention" : "chat",
      title: mentioned ? `${profile.name} mencionou-te no chat` : "Nova mensagem no chat",
      message: `${profile.name}: ${preview}`,
    });
    await sendPushToUser(recipient.id, {
      title: mentioned ? `${profile.name} mencionou-te` : `${profile.name} no chat`,
      body: preview,
      url: recipient.role === "admin" ? "/admin/chat" : "/dashboard/chat",
    });
  }

  await maybeReplyAsLuna(trimmed);

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
