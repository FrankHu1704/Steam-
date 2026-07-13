import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function requireOwnedAgent(agentId: string) {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Não autenticado." as const, status: 401 as const };

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.ownerId !== userId) {
    return { error: "Agente não encontrado." as const, status: 404 as const };
  }

  return { userId, agent };
}
