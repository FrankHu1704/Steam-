import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError, logApiCall } from "@/lib/api-auth";
import { createOrder, createManualOrder } from "@/lib/actions/checkout";
import { hasActiveProductionAccess } from "@/lib/production-access";
import type { PaymentMethod } from "@/lib/debito-pay";

const MANUAL_CHARGE_MIN_AMOUNT = 50;

// Lets a producer build their own custom checkout (on their own site/app)
// instead of using the hosted PagaJá checkout page. Test-mode keys
// simulate a charge instantly with no real money movement; live-mode keys
// (require the one-time 300 MZN production unlock, or a free 24h trial)
// create a real order through the same pipeline as our own checkout, so
// fees, notifications and the producer's own outgoing webhook all still
// apply. Pass either "product_id" (charges one of your PagaJá products) or
// "amount" (a manual charge with no product behind it, for arbitrary
// amounts — most external payment-gateway APIs work this way too).
export async function POST(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) {
    await logApiCall(null, "/api/v1/charges", "POST", 401);
    return apiError("Token inválido ou expirado.", 401);
  }

  const body = await req.json().catch(() => ({}));
  const productId = typeof body.product_id === "string" ? body.product_id : "";
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
  if (!productId && amount == null) {
    await logApiCall(auth.producerId, "/api/v1/charges", "POST", 400);
    return apiError("Indique product_id, ou amount para uma cobrança sem produto.", 400);
  }
  if (!productId && amount != null && amount < MANUAL_CHARGE_MIN_AMOUNT) {
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

  let result: { error?: string; orderId?: string; status?: string; checkoutUrl?: string | null };

  if (productId) {
    const { data: product } = await supabase
      .from("products")
      .select("slug, producer_id, status")
      .eq("id", productId)
      .single();
    if (!product || product.producer_id !== auth.producerId || product.status !== "approved") {
      await logApiCall(auth.producerId, "/api/v1/charges", "POST", 404);
      return apiError("Produto não encontrado ou não pertence a esta conta.", 404);
    }

    result = await createOrder({
      productSlug: product.slug,
      buyerName,
      buyerEmail,
      buyerPhone,
      paymentMethod,
      source: "api",
    });
  } else {
    result = await createManualOrder({
      producerId: auth.producerId,
      amount: amount as number,
      currency,
      description,
      buyerName,
      buyerEmail,
      buyerPhone,
      paymentMethod,
    });
  }

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
