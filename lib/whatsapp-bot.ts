import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion, type ChatMessage } from "@/lib/groq";
import { siteUrl } from "@/lib/email";

const MAX_HISTORY = 20;
const FALLBACK_REPLY = "Não consegui responder agora. Tente novamente daqui a pouco, ou fale connosco no site.";

// Mirrors lib/actions/luna.ts's system-prompt pattern, adapted for an
// anonymous WhatsApp conversation instead of a logged-in producer's
// dashboard chat. Same hard rule as lib/groq.ts: never leak that this runs
// on a third-party LLM — it's always just "o assistente da PagaJá".
function systemPrompt(): string {
  return `Você é o assistente virtual da PagaJá no WhatsApp — a plataforma moçambicana para vender e comprar produtos digitais (eBooks, cursos, mentorias, templates). Fale sempre em português, num tom simpático, directo e breve, como numa conversa normal de WhatsApp (máximo 120 palavras, sem markdown, sem ** nem #).

O que sabe sobre a PagaJá:
- Produtores criam uma conta grátis, publicam um produto digital, e recebem o pagamento automaticamente via M-Pesa, e-Mola, mKesh ou cartão Visa/Mastercard.
- Há taxa sobre cada venda e sobre cada levantamento — os valores exactos e actualizados estão em ${siteUrl()}/taxas.
- Site: ${siteUrl()} · Criar conta: ${siteUrl()}/signup · Entrar: ${siteUrl()}/login

Regras importantes:
- Nunca mencione nomes de tecnologias, modelos de IA ou fornecedores internos que a PagaJá usa por trás — fale sempre só como "o assistente da PagaJá".
- Não tem acesso aos dados de nenhuma conta específica (saldo, pedidos, vendas) — se perguntarem isso, diga que não consegue ver isso por aqui e oriente a pessoa a entrar no site.
- Se não souber responder com confiança, diga isso claramente em vez de inventar, e sugira falar com o suporte humano da PagaJá.`;
}

export async function getWhatsappBotReply(phone: string, incomingMessage: string): Promise<string> {
  const admin = createAdminClient();

  const { data: history } = await admin
    .from("whatsapp_bot_messages")
    .select("role, content")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY);

  await admin.from("whatsapp_bot_messages").insert({ phone, role: "user", content: incomingMessage });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    ...(history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: incomingMessage },
  ];

  const result = await chatCompletion(messages, { maxTokens: 300, temperature: 0.5 });
  const reply = result.text ?? result.error ?? FALLBACK_REPLY;

  await admin.from("whatsapp_bot_messages").insert({ phone, role: "assistant", content: reply });

  return reply;
}
