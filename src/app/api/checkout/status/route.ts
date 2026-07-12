import { NextRequest, NextResponse } from "next/server";
import { plans } from "@/lib/plans";
import { checkStatus } from "@/lib/debitopay";
import { sendWelcomeEmail } from "@/lib/email";
import { provisionCustomer, recordOrder, generateLoginLink } from "@/lib/supabase/customer";

const SUCCESS_STATES = ["success", "completed", "paid"];
const TERMINAL_FAIL_STATES = ["failed", "cancelled", "expired", "error"];

// Dedupe provisioning + welcome emails across polls within the same server instance.
const processedPaymentIds = new Set<string>();

export async function POST(req: NextRequest) {
  const { paymentId, planId, customerName, customerEmail, customerPhone, method } =
    await req.json();

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

    if (customerEmail && !processedPaymentIds.has(paymentId)) {
      processedPaymentIds.add(paymentId);

      (async () => {
        try {
          const customerId = await provisionCustomer({
            email: customerEmail,
            name: customerName || "",
            phone: customerPhone || "",
            planId: plan.id,
          });

          await recordOrder({
            customerId,
            planId: plan.id,
            amount: plan.price,
            paymentMethod: method || "",
            paymentId,
          });

          const loginLink = await generateLoginLink(
            customerEmail,
            `${req.nextUrl.origin}/auth/callback`
          );

          await sendWelcomeEmail({
            to: customerEmail,
            name: customerName || "cliente",
            planName: plan.name,
            loginLink,
          });
        } catch (err) {
          console.error("[checkout] erro ao provisionar conta:", err);
        }
      })();
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
