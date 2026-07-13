import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const agents = await prisma.agent.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Dá um nome ao teu agente." }, { status: 400 });
  }

  const agent = await prisma.agent.create({
    data: { name: name.trim(), ownerId: userId },
  });
  return NextResponse.json({ agent });
}
