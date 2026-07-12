import { NextRequest, NextResponse } from "next/server";

const DEBITO_PAY_URL = process.env.DEBITO_PAY_API_URL;
const DEBITO_PAY_KEY = process.env.DEBITO_PAY_API_KEY;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planId, planName, price, customer } = body ?? {};

  if (!planId || !customer?.name || !customer?.email || !customer?.phone) {
    return NextResponse.json(
      { message: "Dados do plano ou do cliente em falta." },
      { status: 400 }
    );
  }

  if (!DEBITO_PAY_URL || !DEBITO_PAY_KEY) {
    return NextResponse.json(
      {
        message:
          "Pagamento não configurado. Defina DEBITO_PAY_API_URL e DEBITO_PAY_API_KEY.",
      },
      { status: 503 }
    );
  }

  try {
    const paymentRes = await fetch(DEBITO_PAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEBITO_PAY_KEY}`,
      },
      body: JSON.stringify({
        amount: price,
        currency: "MZN",
        description: `Senga Host - Plano ${planName}`,
        customer,
        metadata: { planId },
        successUrl: `${req.nextUrl.origin}/pagamento/sucesso`,
        cancelUrl: `${req.nextUrl.origin}/pagamento/cancelado`,
      }),
    });

    if (!paymentRes.ok) {
      const errText = await paymentRes.text();
      return NextResponse.json(
        { message: `Débito Pay recusou o pedido: ${errText}` },
        { status: 502 }
      );
    }

    const paymentData = await paymentRes.json();

    return NextResponse.json({
      paymentUrl: paymentData.paymentUrl ?? paymentData.url ?? null,
      reference: paymentData.reference ?? null,
    });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível ligar ao serviço de pagamento." },
      { status: 502 }
    );
  }
}
