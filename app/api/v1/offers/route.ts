import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError } from "@/lib/api-auth";

// Each product exposes a default "offer" (1:1 mapping), useful for
// integrations that work with the offer concept instead of raw products.
export async function GET(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const supabase = createAdminClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, promo_price, currency, status, created_at")
    .eq("producer_id", auth.producerId)
    .order("created_at", { ascending: false });

  return Response.json({
    success: true,
    offers: (products ?? []).map((p) => ({
      id: `offer_${p.id}`,
      product_id: p.id,
      name: `${p.title} (Oferta Padrão)`,
      price: p.promo_price ?? p.price,
      currency: p.currency,
      status: p.status === "approved" ? "active" : "inactive",
      created_at: p.created_at,
    })),
  });
}
