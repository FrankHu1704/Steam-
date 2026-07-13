import { redirect, notFound } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AgentPanel from "./AgentPanel";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { trainingEntries: { orderBy: { createdAt: "desc" } } },
  });
  if (!agent || agent.ownerId !== userId) notFound();

  return (
    <AgentPanel
      agent={{
        id: agent.id,
        name: agent.name,
        phoneNumber: agent.phoneNumber,
        status: agent.status,
        pairingCode: agent.pairingCode,
        customInstructions: agent.customInstructions,
        trainingEntries: agent.trainingEntries.map((t) => ({
          id: t.id,
          question: t.question,
          answer: t.answer,
        })),
      }}
    />
  );
}
