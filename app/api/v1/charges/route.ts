import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError, logApiCall } from "@/lib/api-auth";
import { createManualOrder } from "@/lib/actions/checkout";
import { hasActiveProductionAccess } from "@/lib/production-access";
import type { PaymentMethod } from "@/lib/debito-pay";

const MANUAL_CHARGE_MIN_AMOUNT = 50;

// Lets a producer build their own custom checkout (on their own site/app)
// instead of using the hosted PayNow checkout page. Charges are always for
// an arbitrary "amount" — there's no product_id path, so a programmer never
// needs to create/manage a PayNow product (with its own approval flow) just
// to charge via the API. Test-mode keys simulate a charge instantly with no
// real money movement; live-mode keys (require the one-time 300 MZN
// production unlock, or a free 24h trial) create a real order through the
// same pipeline as our own checkout, so fees, notifications and the
// producer's own outgoing webhook all still apply.
export async function POST(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) {
    await logApiCall(null, "/api/v1/charges", "POST", 401);
    return apiError("Token inválido ou expirado.", 401);
  }

  const body = await req.json().catch(() => ({}));
  const amount = typeof body.amount === "number" ? body.amount : undefined;
  const currency = body.currency === "ZAR" ? "ZAR" : "MZN";
  const description = typeof body.description === "string" ? body.description : undefined;
  const buyerName = typeof body.customer_name === "string" ? body.customer_name : "";
  const buyerEmail = typeof body.customer_email === "string" ? body.customer_email : "";
  const buyerPhone = typeof body.customer_phone === "string" ? body.customer_phone : undefined;
  const paymentMethod = (body.payment_method as PaymentMethod) || "mpesa";

  if (!buyerName || !buyerEmail) {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 400);
    return apiError("customer_name e customer_email são obrigatórios.", 400);
  }
  if (amount == null) {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 400);
    return apiError("amount é obrigatório.", 400);
  }
  if (amount < MANUAL_CHARGE_MIN_AMOUNT) {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 400);
    return apiError(`amount deve ser de pelo menos ${MANUAL_CHARGE_MIN_AMOUNT}.`, 400);
  }

  if (auth.mode === "test") {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 200);
    return Response.json({
      success: true,
      data: {
        reference: `test_${crypto.randomBytes(8).toString("hex")}`,
        status: "success",
        test_mode: true,
      },
    });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("production_unlocked_at, production_access_expires_at")
    .eq("id", auth.producerId)
    .single();
  if (!profile || !hasActiveProductionAccess(profile)) {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 403);
    return apiError("Modo produção não desbloqueado para esta conta (nem o teste grátis de 24h está ativo).", 403);
  }

  const result = await createManualOrder({
    producerId: auth.producerId,
    amount,
    currency,
    description,
    buyerName,
    buyerEmail,
    buyerPhone,
    paymentMethod,
  });

  if (result.error || !result.orderId) {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 400);
    return apiError(result.error ?? "Falha ao criar a cobrança.", 400);
  }

  await logApiCall(auth.producerId, "/api/v1/charges", "POST", 201);
  return Response.json(
    {
      success: true,
      data: { reference: result.orderId, status: result.status, checkout_url: result.checkoutUrl },
    },
    { status: 201 }
  );
}
