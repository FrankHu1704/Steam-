import { NextRequest, NextResponse } from "next/server";
import { paidPlans } from "@/lib/plans";
import { isConfigured, processPayment, PaymentMethod } from "@/lib/debitopay";

const VALID_METHODS: PaymentMethod[] = ["mpesa", "emola"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planId, method, customer } = body ?? {};

  const plan = paidPlans.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
  }

  if (!VALID_METHODS.includes(method)) {
    return NextResponse.json(
      { message: "Escolha M-Pesa ou e-Mola." },
      { status: 400 }
    );
  }

  if (!customer?.name || !customer?.email || !customer?.phone) {
    return NextResponse.json(
      { message: "Dados do cliente em falta." },
      { status: 400 }
    );
  }

  const phone = String(customer.phone).replace(/\D+/g, "").slice(-9);
  if (!/^\d{9}$/.test(phone)) {
    return NextResponse.json(
      { message: "Introduza um número de telefone válido (9 dígitos)." },
      { status: 400 }
    );
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { message: "Pagamento não configurado no servidor." },
      { status: 503 }
    );
  }

  const sourceId = `${plan.id}-${Date.now()}`;

  const res = await processPayment({
    method,
    amount: plan.price,
    phone,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    sourceId,
  });

  const data = res.body;
  if (!data?.success) {
    const err =
      typeof data?.error === "string" ? data.error : `Erro HTTP ${res.status}`;
    return NextResponse.json(
      { message: `DebitoPay: ${err}` },
      { status: res.status >= 400 ? res.status : 502 }
    );
  }

  return NextResponse.json({
    paymentId: data.payment_id,
    checkoutUrl: data.checkout_url ?? null,
  });
}
