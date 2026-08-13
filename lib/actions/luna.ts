"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion, type ChatMessage } from "@/lib/groq";

const SYSTEM_PROMPT = `Você é a LunaAI, a assistente de marketing e vendas da PayNow (plataforma moçambicana de venda de infoprodutos digitais — eBooks, cursos, mentorias). Fale sempre em português, num tom direto, prático e encorajador. Dê dicas específicas e acionáveis para o mercado moçambicano (M-Pesa, e-Mola, Facebook, Instagram, TikTok). Quando perguntarem sobre escalar anúncios, aumentar vendas, definir preços ou marketing em geral, dê passos concretos, não teoria genérica. Respostas curtas (máximo 180 palavras), sem markdown (sem ** ou #).`;

export async function askLuna(message: string): Promise<{ reply?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!message.trim()) return { error: "Escreva uma pergunta." };

  const [{ data: products }, { data: history }] = await Promise.all([
    supabase.from("products").select("title, price, currency, sales_count, view_count").eq("producer_id", user.id),
    supabase
      .from("luna_messages")
      .select("role, content")
      .eq("producer_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  const rows = products ?? [];
  const totalSales = rows.reduce((sum, p) => sum + p.sales_count, 0);
  const topProduct = rows.slice().sort((a, b) => b.sales_count - a.sales_count)[0];

  const accountContext = `Contexto da conta deste produtor: ${rows.length} produto(s) publicado(s), ${totalSales} venda(s) no total.${
    topProduct && topProduct.sales_count > 0
      ? ` Produto mais vendido: "${topProduct.title}" (${topProduct.sales_count} vendas, ${topProduct.price} ${topProduct.currency}).`
      : " Ainda sem vendas registadas."
  }`;

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${accountContext}` },
    ...(history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message.trim() },
  ];

  const admin = createAdminClient();
  await admin.from("luna_messages").insert({ producer_id: user.id, role: "user", content: message.trim() });

  const result = await chatCompletion(messages, { maxTokens: 500 });
  if (result.error || !result.text) return { error: result.error ?? "A LunaAI não devolveu uma resposta." };

  await admin.from("luna_messages").insert({ producer_id: user.id, role: "assistant", content: result.text });

  revalidatePath("/dashboard/luna");
  return { reply: result.text };
}

export async function clearLunaHistory(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  await admin.from("luna_messages").delete().eq("producer_id", user.id);

  revalidatePath("/dashboard/luna");
  return { ok: true };
}
