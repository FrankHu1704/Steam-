import { NextRequest, NextResponse } from "next/server";
import { requireOwnedAgent } from "@/lib/agentAccess";
import { connectAgent } from "@/lib/whatsapp/manager";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedAgent(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { phoneNumber } = await req.json();
  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Número de WhatsApp inválido." }, { status: 400 });
  }

  try {
    const { pairingCode } = await connectAgent(id, phoneNumber);
    return NextResponse.json({ pairingCode });
  } catch (e) {
    console.error("[connect]", e);
    return NextResponse.json({ error: "Não foi possível gerar o código de pareamento." }, { status: 500 });
  }
}
