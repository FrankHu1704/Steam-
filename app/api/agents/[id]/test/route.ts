import { NextRequest, NextResponse } from "next/server";
import { requireOwnedAgent } from "@/lib/agentAccess";
import { prisma } from "@/lib/db";
import { buildSystemPrompt, appendSignature } from "@/lib/identity";
import { chamarGroq, type ChatMessage } from "@/lib/groq";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedAgent(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Envia pelo menos uma mensagem." }, { status: 400 });
  }

  const trainingEntries = await prisma.trainingEntry.findMany({ where: { agentId: id } });
  const systemPrompt = buildSystemPrompt(access.agent, trainingEntries);

  try {
    const reply = await chamarGroq([{ role: "system", content: systemPrompt }, ...messages]);
    return NextResponse.json({ reply: appendSignature(reply) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao contactar a IA." },
      { status: 500 }
    );
  }
}
