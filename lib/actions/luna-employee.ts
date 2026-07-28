"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion, type ChatMessage } from "@/lib/groq";
import { getEmployeeByUserId, getEmployeeOverview } from "@/lib/data/employees";

const SYSTEM_PROMPT = `Você é a LunaAI, a assistente de suporte da PagaJá para colaboradores (pessoas que recrutam produtores para a plataforma). Fale sempre em português, tom direto e prestável. Ajude com dúvidas sobre o programa: link único de recrutamento, comissão sobre as vendas dos produtores recrutados durante os primeiros 3 meses de cada um, pagamento automático no dia 1 de cada mês, e dê dicas práticas de como recrutar mais produtores (onde partilhar o link, como abordar potenciais produtores, como acompanhar quem já está a vender). Respostas curtas (máximo 180 palavras), sem markdown (sem ** ou #).`;

export async function askLunaAsEmployee(message: string): Promise<{ reply?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!message.trim()) return { error: "Escreva uma pergunta." };

  const employee = await getEmployeeByUserId(user.id);
  if (!employee) return { error: "Acesso negado." };

  const overview = await getEmployeeOverview(employee.id);
  const admin = createAdminClient();

  const { data: history } = await admin
    .from("luna_messages")
    .select("role, content")
    .eq("producer_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const accountContext = `Contexto deste colaborador: comissão de ${employee.commission_percent}% por venda, ${overview.registeredCount} produtor(es) recrutado(s) até agora, ${overview.producingCount} já com produtos aprovados, ${overview.clicksCount} cliques no link, saldo por pagar ${overview.totalEarned} MZN.`;

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${accountContext}` },
    ...(history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message.trim() },
  ];

  await admin.from("luna_messages").insert({ producer_id: user.id, role: "user", content: message.trim() });

  const result = await chatCompletion(messages, { maxTokens: 500 });
  if (result.error || !result.text) return { error: result.error ?? "A LunaAI não devolveu uma resposta." };

  await admin.from("luna_messages").insert({ producer_id: user.id, role: "assistant", content: result.text });

  revalidatePath("/colaborador/luna");
  return { reply: result.text };
}

export async function clearLunaHistoryAsEmployee(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  await admin.from("luna_messages").delete().eq("producer_id", user.id);

  revalidatePath("/colaborador/luna");
  return { ok: true };
}
