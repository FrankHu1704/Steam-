import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError, logApiCall } from "@/lib/api-auth";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

// Lists the account's confirmed sales, most recent first. Supports
// cursor-based pagination (cursor = the last order id from the previous
// page) plus optional since/until date filtering — the cursor is looked up
// first to read its created_at, then every subsequent row strictly older
// than that timestamp is returned, which keeps pagination stable even if
// new orders land between page requests.
export async function GET(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) {
    await logApiCall(null, "/api/v1/orders", "GET", 401);
    return apiError("Token inválido ou expirado.", 401);
  }

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  const cursor = url.searchParams.get("cursor");
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

  if (since && Number.isNaN(Date.parse(since))) {
    await logApiCall(auth.producerId, "/api/v1/orders", "GET", 400);
    return apiError("since deve ser uma data válida (ISO 8601).", 400);
  }
  if (until && Number.isNaN(Date.parse(until))) {
    await logApiCall(auth.producerId, "/api/v1/orders", "GET", 400);
    return apiError("until deve ser uma data válida (ISO 8601).", 400);
  }

  const supabase = createAdminClient();

  let cursorCreatedAt: string | null = null;
  if (cursor) {
    const { data: cursorOrder } = await supabase
      .from("orders")
      .select("created_at")
      .eq("id", cursor)
      .eq("producer_id", auth.producerId)
      .single();
    if (!cursorOrder) {
      await logApiCall(auth.producerId, "/api/v1/orders", "GET", 400);
      return apiError("cursor inválido — não corresponde a uma venda desta conta.", 400);
    }
    cursorCreatedAt = cursorOrder.created_at;
  }

  let query = supabase
    .from("orders")
    .select("id, buyer_name, buyer_email, buyer_phone, total_amount, currency, status, created_at, products(id, title)")
    .eq("producer_id", auth.producerId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (since) query = query.gte("created_at", new Date(since).toISOString());
  if (until) query = query.lte("created_at", new Date(until).toISOString());
  if (cursorCreatedAt) query = query.lt("created_at", cursorCreatedAt);

  const { data: orders } = await query;

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

  const rows = (orders ?? []) as unknown as Row[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  await logApiCall(auth.producerId, "/api/v1/orders", "GET", 200);
  return Response.json({
    success: true,
    orders: page.map((o) => ({
      id: o.id,
      customer: { name: o.buyer_name, email: o.buyer_email, phone: o.buyer_phone },
      product: { id: o.products?.id ?? null, name: o.products?.title ?? "Produto" },
      amount: o.total_amount,
      currency: o.currency,
      status: o.status,
      created_at: o.created_at,
    })),
    has_more: hasMore,
    next_cursor: hasMore ? page[page.length - 1].id : null,
  });
}
