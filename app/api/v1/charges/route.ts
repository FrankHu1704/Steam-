import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError } from "@/lib/api-auth";
import { createOrder } from "@/lib/actions/checkout";
import type { PaymentMethod } from "@/lib/debito-pay";

// Lets a producer build their own custom checkout (on their own site/app)
// instead of using the hosted PagaJá checkout page. Test-mode keys
// simulate a charge instantly with no real money movement; live-mode keys
// (require the one-time 300 MZN production unlock) create a real order
// through the same pipeline as our own checkout, so fees, notifications
// and the producer's own outgoing webhook all still apply.
export async function POST(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const body = await req.json().catch(() => ({}));
  const productId = typeof body.product_id === "string" ? body.product_id : "";
  const buyerName = typeof body.customer_name === "string" ? body.customer_name : "";
  const buyerEmail = typeof body.customer_email === "string" ? body.customer_email : "";
  const buyerPhone = typeof body.customer_phone === "string" ? body.customer_phone : undefined;
  const paymentMethod = (body.payment_method as PaymentMethod) || "mpesa";

  if (!productId || !buyerName || !buyerEmail) {
    return apiError("product_id, customer_name e customer_email são obrigatórios.", 400);
  }

  if (auth.mode === "test") {
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
    .select("production_unlocked_at")
    .eq("id", auth.producerId)
    .single();
  if (!profile?.production_unlocked_at) {
    return apiError("Modo produção não desbloqueado para esta conta.", 403);
  }

  const { data: product } = await supabase
    .from("products")
    .select("slug, producer_id, status")
    .eq("id", productId)
    .single();
  if (!product || product.producer_id !== auth.producerId || product.status !== "approved") {
    return apiError("Produto não encontrado ou não pertence a esta conta.", 404);
  }

  const result = await createOrder({
    productSlug: product.slug,
    buyerName,
    buyerEmail,
    buyerPhone,
    paymentMethod,
  });

  if (result.error || !result.orderId) {
    return apiError(result.error ?? "Falha ao criar a cobrança.", 400);
  }

  return Response.json(
    {
      success: true,
      data: { reference: result.orderId, status: result.status, checkout_url: result.checkoutUrl },
    },
    { status: 201 }
  );
}
