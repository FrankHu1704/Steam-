import { NextRequest, NextResponse } from "next/server";
import { trialPlan } from "@/lib/plans";
import { sendWelcomeEmail } from "@/lib/email";
import {
  provisionCustomer,
  recordOrder,
  generateLoginLink,
  findProfileByEmail,
} from "@/lib/supabase/customer";

export async function POST(req: NextRequest) {
  const { customer } = await req.json();

  if (!customer?.name || !customer?.email || !customer?.phone) {
    return NextResponse.json(
      { message: "Dados do cliente em falta." },
      { status: 400 }
    );
  }

  const existing = await findProfileByEmail(customer.email);
  if (existing?.plan_id) {
    return NextResponse.json(
      {
        message:
          "Já existe uma conta com este email. Entre em /painel/login para aceder.",
      },
      { status: 409 }
    );
  }

  const trialEndsAt = new Date(
    Date.now() + (trialPlan.trialHours ?? 48) * 60 * 60 * 1000
  ).toISOString();

  try {
    const customerId = await provisionCustomer({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      planId: trialPlan.id,
      trialEndsAt,
    });

    await recordOrder({
      customerId,
      planId: trialPlan.id,
      amount: 0,
      paymentMethod: "trial",
      paymentId: `trial-${customerId}-${Date.now()}`,
    });

    const loginLink = await generateLoginLink(
      customer.email,
      `${req.nextUrl.origin}/auth/callback`
    );

    await sendWelcomeEmail({
      to: customer.email,
      name: customer.name,
      planName: `${trialPlan.name} (48h)`,
      loginLink,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Erro inesperado." },
      { status: 500 }
    );
  }
}
