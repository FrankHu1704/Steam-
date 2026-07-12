import { NextRequest, NextResponse } from "next/server";
import { plans } from "@/lib/plans";
import { checkStatus } from "@/lib/debitopay";

const SUCCESS_STATES = ["success", "completed", "paid"];
const TERMINAL_FAIL_STATES = ["failed", "cancelled", "expired", "error"];

export async function POST(req: NextRequest) {
  const { paymentId, planId } = await req.json();

  const plan = plans.find((p) => p.id === planId);
  if (!plan || !paymentId) {
    return NextResponse.json({ status: "error", message: "Dados inválidos." }, { status: 400 });
  }

  const res = await checkStatus(paymentId);
  const auth = res.body?.payment as
    | { status?: string; amount?: number; currency?: string }
    | undefined;

  if (!auth) {
    return NextResponse.json({ status: "pending" });
  }

  const authStatus = String(auth.status ?? "").toLowerCase();

  if (SUCCESS_STATES.includes(authStatus)) {
    const authAmount = Math.round(Number(auth.amount ?? 0) * 100) / 100;
    const authCurrency = String(auth.currency ?? "").toUpperCase();

    if (authAmount !== plan.price || (authCurrency && authCurrency !== "MZN")) {
      return NextResponse.json({
        status: "mismatch",
        message: "Montante confirmado difere do esperado. Contacte o suporte.",
      });
    }

    return NextResponse.json({ status: "paid" });
  }

  if (TERMINAL_FAIL_STATES.includes(authStatus)) {
    return NextResponse.json({
      status: authStatus,
      message: `Pagamento ${authStatus}. Nenhum montante foi cobrado.`,
    });
  }

  return NextResponse.json({ status: "pending" });
}
