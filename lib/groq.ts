// LunaAI's product-analysis backend — internally calls Groq's OpenAI-compatible
// chat completions API, but this must never be exposed to producers: no error
// message here should leak the word "Groq", the model name, or any raw
// third-party response text. Real failures are logged server-side (the
// `logs` table, action "ai_debug") for admin debugging instead.

import { createAdminClient } from "@/lib/supabase/admin";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

async function logAiDebug(metadata: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("logs").insert({ action: "ai_debug", metadata });
  } catch {
    // Best-effort only.
  }
}

export async function analyzeProductWithGroq(
  input: ProductAnalysisInput
): Promise<{ analysis?: string; error?: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    await logAiDebug({ skipped: true, reason: "no GROQ_API_KEY" });
    return { error: "A LunaAI ainda não está disponível. Tente novamente mais tarde." };
  }

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

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      await logAiDebug({ status: res.status, body });
      return { error: "A LunaAI não conseguiu analisar este produto agora. Tente novamente daqui a pouco." };
    }

    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      await logAiDebug({ status: res.status, note: "empty response", body });
      return { error: "A LunaAI não devolveu uma resposta. Tente novamente." };
    }
    return { analysis: text };
  } catch (err) {
    await logAiDebug({ error: (err as Error).message });
    return { error: "A LunaAI não conseguiu analisar este produto agora. Tente novamente daqui a pouco." };
  }
}
