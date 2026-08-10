// LunaAI's backend — internally calls Groq's OpenAI-compatible chat
// completions API, but this must never be exposed to producers: no error
// message here should leak the word "Groq", the model name, or any raw
// third-party response text. Real failures are logged server-side (the
// `logs` table, action "ai_debug") for admin debugging instead.
//
// Supports multiple API keys (GROQ_API_KEYS, comma-separated) so a rate
// limit on one key fails over to the next rather than failing the request —
// falls back to the single GROQ_API_KEY if only one is configured.

import { createAdminClient } from "@/lib/supabase/admin";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GENERIC_ERROR = "A LunaAI não conseguiu responder agora. Tente novamente daqui a pouco.";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function logAiDebug(metadata: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("logs").insert({ action: "ai_debug", metadata });
  } catch {
    // Best-effort only.
  }
}

function getApiKeys(): string[] {
  const multi = process.env.GROQ_API_KEYS;
  if (multi) {
    const keys = multi
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length > 0) return keys;
  }
  const single = process.env.GROQ_API_KEY?.trim();
  return single ? [single] : [];
}

// Fisher-Yates — spreads load across keys roughly evenly instead of always
// hammering the first one.
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ text?: string; error?: string }> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    await logAiDebug({ skipped: true, reason: "no GROQ_API_KEY(S)" });
    return { error: "A LunaAI ainda não está disponível. Tente novamente mais tarde." };
  }

  const attempts: { key: string; status?: number; error?: string }[] = [];

  for (const apiKey of shuffled(keys)) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages,
          temperature: options?.temperature ?? 0.6,
          max_tokens: options?.maxTokens ?? 600,
        }),
      });

      const body = await res.json().catch(() => null);

      // 401/403 (bad key) or 429 (rate limited) — try the next key instead
      // of failing the whole request.
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        attempts.push({ key: apiKey.slice(-6), status: res.status });
        continue;
      }

      if (!res.ok) {
        attempts.push({ key: apiKey.slice(-6), status: res.status });
        await logAiDebug({ attempts: [...attempts, { status: res.status, body }] });
        return { error: GENERIC_ERROR };
      }

      const text = body?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        attempts.push({ key: apiKey.slice(-6), status: res.status });
        await logAiDebug({ attempts, note: "empty response", body });
        return { error: "A LunaAI não devolveu uma resposta. Tente novamente." };
      }
      return { text };
    } catch (err) {
      attempts.push({ key: apiKey.slice(-6), error: (err as Error).message });
    }
  }

  await logAiDebug({ attempts, note: "all keys exhausted" });
  return { error: GENERIC_ERROR };
}

export interface ProductAnalysisInput {
  title: string;
  description: string;
  price: number;
  promoPrice: number | null;
  currency: string;
  categoryName: string | null;
  salesCount: number;
  viewCount: number;
}

export async function analyzeProductWithGroq(
  input: ProductAnalysisInput
): Promise<{ analysis?: string; error?: string }> {
  const conversionNote =
    input.viewCount > 0
      ? `Taxa de conversão aproximada: ${((input.salesCount / input.viewCount) * 100).toFixed(1)}% (${input.salesCount} vendas em ${input.viewCount} visualizações).`
      : "Ainda sem visualizações registadas.";

  const prompt = `Você é um consultor de marketing digital especializado em infoprodutos no mercado moçambicano (M-Pesa, e-Mola). Analise este produto e dê sugestões práticas e diretas em português, para o produtor melhorar as vendas.

Produto: ${input.title}
Categoria: ${input.categoryName ?? "Sem categoria"}
Preço: ${input.promoPrice ?? input.price} ${input.currency}${
    input.promoPrice ? ` (preço promocional; preço normal ${input.price} ${input.currency})` : ""
  }
Descrição atual: """${input.description || "(sem descrição)"}"""
${conversionNote}

Responde em português, tom direto e prático, organizado em tópicos curtos com travessões (sem markdown como ** ou #). Cobre: (1) o que está bom, (2) o que falta no título/descrição, (3) se o preço parece adequado para o mercado moçambicano, (4) uma sugestão concreta para aumentar conversão. Máximo 200 palavras.`;

  const result = await chatCompletion([{ role: "user", content: prompt }]);
  if (result.error) return { error: result.error };
  return { analysis: result.text };
}

// "Melhorar com IA" on the normal product wizard's description field —
// rewrites/expands whatever the producer already typed (or drafts one from
// scratch if the field is still empty), returned as plain text for them to
// review/edit, same non-automatic pattern as the rest of LunaAI.
export async function improveDescriptionWithGroq(
  title: string,
  currentDescription: string
): Promise<{ description?: string; error?: string }> {
  const prompt = currentDescription.trim()
    ? `Você é a LunaAI, assistente de vendas da PagaJá. Reescreva a descrição abaixo do produto "${title}" para ser mais persuasiva e clara, mantendo as informações reais que o produtor já deu (não invente factos, números ou promessas que não estão lá). Português, tom direto, para o mercado moçambicano. Responde APENAS com o texto da nova descrição, sem markdown, sem aspas, sem comentários.

Descrição atual: """${currentDescription.trim()}"""`
    : `Você é a LunaAI, assistente de vendas da PagaJá. Escreva uma descrição de vendas persuasiva (3-5 frases) para um infoproduto chamado "${title}", vendido no mercado moçambicano. Como não há mais detalhes, mantenha-a genérica mas convincente, sem inventar factos específicos (números, resultados, prazos). Responde APENAS com o texto da descrição, sem markdown, sem aspas.`;

  const result = await chatCompletion([{ role: "user", content: prompt }], { temperature: 0.7, maxTokens: 350 });
  if (result.error || !result.text) return { error: result.error ?? GENERIC_ERROR };
  return { description: result.text.trim() };
}

export interface CheckoutCopyResult {
  title: string;
  description: string;
  highlightText: string;
}

// Structured JSON output (title/description/highlight) instead of the free
// text the rest of LunaAI returns — the caller applies this straight to
// products.title/description/checkout_highlight_text, so it has to be
// clean, bounded fields rather than a paragraph to parse.
export async function generateCheckoutCopyWithGroq(
  rawDescription: string
): Promise<{ result?: CheckoutCopyResult; error?: string }> {
  const prompt = `Você é a LunaAI, assistente de vendas da PagaJá (plataforma moçambicana de infoprodutos). Um produtor descreveu, nas próprias palavras, o que está a vender através de um link de pagamento direto. Escreva uma versão persuasiva para a página de checkout.

Descrição do produtor: """${rawDescription}"""

Responde APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{"title": "título curto e persuasivo (máx 60 caracteres)", "description": "descrição persuasiva de 2-4 frases (máx 400 caracteres)", "highlightText": "frase curta de destaque/confiança para mostrar acima do botão de pagamento, ex: garantia, entrega imediata (máx 60 caracteres)"}

Tom direto, para o mercado moçambicano, sem exageros nem promessas irreais.`;

  const result = await chatCompletion([{ role: "user", content: prompt }], { temperature: 0.7, maxTokens: 400 });
  if (result.error || !result.text) return { error: result.error ?? GENERIC_ERROR };

  try {
    const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.highlightText !== "string"
    ) {
      throw new Error("unexpected shape");
    }
    return {
      result: {
        title: parsed.title.slice(0, 120).trim(),
        description: parsed.description.slice(0, 500).trim(),
        highlightText: parsed.highlightText.slice(0, 80).trim(),
      },
    };
  } catch {
    await logAiDebug({ note: "checkout_copy_parse_failed", raw: result.text });
    return { error: "A LunaAI não conseguiu gerar o texto agora. Tente novamente." };
  }
}
