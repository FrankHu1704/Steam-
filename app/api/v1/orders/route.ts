import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError, logApiCall } from "@/lib/api-auth";

// Lists the account's confirmed sales.
export async function GET(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) {
    await logApiCall(null, "/api/v1/orders", "GET", 401);
    return apiError("Token inválido ou expirado.", 401);
  }

  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, buyer_name, buyer_email, buyer_phone, total_amount, currency, status, created_at, products(id, title)")
    .eq("producer_id", auth.producerId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = {
    id: string;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string | null;
    total_amount: number;
    currency: string;
    status: string;
    created_at: string;
    products: { id: string; title: string } | null;
  };

  await logApiCall(auth.producerId, "/api/v1/orders", "GET", 200);
  return Response.json({
    success: true,
    orders: ((orders ?? []) as unknown as Row[]).map((o) => ({
      id: o.id,
      customer: { name: o.buyer_name, email: o.buyer_email, phone: o.buyer_phone },
      product: { id: o.products?.id ?? null, name: o.products?.title ?? "Produto" },
      amount: o.total_amount,
      currency: o.currency,
      status: o.status,
      created_at: o.created_at,
    })),
  });
}
