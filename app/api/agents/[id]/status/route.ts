import { NextRequest, NextResponse } from "next/server";
import { requireOwnedAgent } from "@/lib/agentAccess";
import { getRuntimeStatus } from "@/lib/whatsapp/manager";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedAgent(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const runtime = getRuntimeStatus(id);
  return NextResponse.json({
    status: runtime?.status ?? access.agent.status,
    pairingCode: runtime?.pairingCode ?? access.agent.pairingCode ?? null,
  });
}
