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
