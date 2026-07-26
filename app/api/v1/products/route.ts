import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBearerToken, apiError } from "@/lib/api-auth";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const supabase = createAdminClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, description, price, currency, status, created_at")
    .eq("producer_id", auth.producerId)
    .order("created_at", { ascending: false });

  return Response.json({
    success: true,
    products: (products ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price_mzn: p.price,
      status: p.status,
      created_at: p.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await verifyBearerToken(req.headers.get("authorization"));
  if (!auth) return apiError("Token inválido ou expirado.", 401);

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const priceMzn = Number(body.price_mzn);
  const description = typeof body.description === "string" ? body.description : "";

  if (!title || !Number.isFinite(priceMzn) || priceMzn <= 0) {
    return apiError("title e price_mzn (maior que zero) são obrigatórios.", 400);
  }

  const supabase = createAdminClient();
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      producer_id: auth.producerId,
      title,
      slug,
      description,
      price: priceMzn,
      currency: "MZN",
      status: "pending",
    })
    .select("id, title, price, status")
    .single();

  if (error || !product) return apiError(error?.message ?? "Falha ao criar o produto.", 400);

  return Response.json(
    {
      success: true,
      product: { id: product.id, title: product.title, price_mzn: product.price, status: product.status },
    },
    { status: 201 }
  );
}
