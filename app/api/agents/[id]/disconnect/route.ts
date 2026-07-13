import { NextRequest, NextResponse } from "next/server";
import { requireOwnedAgent } from "@/lib/agentAccess";
import { disconnectAgent } from "@/lib/whatsapp/manager";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedAgent(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await disconnectAgent(id);
  return NextResponse.json({ ok: true });
}
