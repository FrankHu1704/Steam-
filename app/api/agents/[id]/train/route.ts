import { NextRequest, NextResponse } from "next/server";
import { requireOwnedAgent } from "@/lib/agentAccess";
import { prisma } from "@/lib/db";
import { sanitizeTraining } from "@/lib/identity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedAgent(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const trainingEntries = await prisma.trainingEntry.findMany({
    where: { agentId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ customInstructions: access.agent.customInstructions, trainingEntries });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedAgent(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { customInstructions, addEntry } = await req.json();

  if (typeof customInstructions === "string") {
    await prisma.agent.update({
      where: { id },
      data: { customInstructions: sanitizeTraining(customInstructions) },
    });
  }

  if (addEntry && addEntry.question && addEntry.answer) {
    await prisma.trainingEntry.create({
      data: {
        agentId: id,
        question: String(addEntry.question).slice(0, 2000),
        answer: sanitizeTraining(String(addEntry.answer).slice(0, 4000)),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
