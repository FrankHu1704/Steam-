"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion, type ChatMessage } from "@/lib/groq";

const SYSTEM_PROMPT = `Você é o assistente de suporte da PagaJá, plataforma moçambicana de venda de infoprodutos digitais (eBooks, cursos, mentorias, ficheiros). Fale sempre em português, tom simpático e direto. Responde em no máximo 120 palavras, sem markdown (sem ** ou #).

O que sabe sobre a plataforma:
- Saldo e saques: em "Financeiro" ou "Saques" no menu — o produtor guarda uma carteira M-Pesa/e-Mola e pede levantamento; normalmente processado em minutos (B2C automático) ou até 48h se for manual.
- Publicar produto: em "Produtos" → "Novo Produto" (eBook/curso completo, com categoria e loja) ou "Link de Pagamento" (mais rápido, sem categoria, não aparece no marketplace). Todo produto fica "pendente" até um admin aprovar.
- Afiliados: em "Afiliados" o produtor ativa o programa no produto e define a comissão; outros produtores podem promover e ganham essa percentagem por venda.
- Indicações: cada conta tem um link de indicação próprio — quem se regista por ele e vende gera comissão para quem indicou, durante os primeiros 30 dias.
- Premiações: metas de faturamento acumulado dão prémios físicos (pulseira, placa), vistos em "Premiações".
- Segurança: 2FA (TOTP) disponível em "Definições" → "Segurança".
- Pagamentos aceites: M-Pesa e e-Mola sempre; Cartão/PayPal internacional em breve.

Se não souberes responder com confiança, diz para falar com o suporte humano pelo WhatsApp, não inventes informação.`;

export async function askSupportBot(message: string): Promise<{ reply?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!message.trim()) return { error: "Escreva uma pergunta." };

  const admin = createAdminClient();

  const [{ data: profile }, { data: history }] = await Promise.all([
    admin.from("profiles").select("name, role, balance_available, currency").eq("id", user.id).maybeSingle(),
    admin
      .from("support_bot_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  const accountContext = profile
    ? `Conta do utilizador: papel "${profile.role}"${
        profile.role === "producer" || profile.role === "admin"
          ? `, saldo disponível ${profile.balance_available} ${profile.currency}`
          : ""
      }.`
    : "";

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${accountContext}` },
    ...((history ?? []) as { role: "user" | "assistant"; content: string }[]).map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: message.trim() },
  ];

  await admin.from("support_bot_messages").insert({ user_id: user.id, role: "user", content: message.trim() });

  const result = await chatCompletion(messages, { maxTokens: 350 });
  if (result.error || !result.text) return { error: result.error ?? "O suporte não conseguiu responder agora." };

  await admin.from("support_bot_messages").insert({ user_id: user.id, role: "assistant", content: result.text });

  revalidatePath("/");
  return { reply: result.text };
}

export interface SupportBotMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getSupportBotHistory(): Promise<SupportBotMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("support_bot_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20);
  return (data ?? []) as SupportBotMessage[];
}

export async function clearSupportBotHistory(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  await admin.from("support_bot_messages").delete().eq("user_id", user.id);
  return { ok: true };
}
