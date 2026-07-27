// Groq's OpenAI-compatible chat completions API — used to generate a quick
// marketing/sales analysis for a producer's product, on demand (not
// automatic), since it costs an API call each time.

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

export async function analyzeProductWithGroq(
  input: ProductAnalysisInput
): Promise<{ analysis?: string; error?: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { error: "Análise por IA não configurada (falta GROQ_API_KEY)." };

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
      return { error: body?.error?.message || `Falha na análise (HTTP ${res.status}).` };
    }

    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) return { error: "A IA não devolveu uma resposta." };
    return { analysis: text };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
