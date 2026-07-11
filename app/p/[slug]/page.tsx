import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";

export default async function ProductSalePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const supabase = createAdminClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single<Product>();

  if (!product) notFound();

  await supabase.rpc("increment_product_views", { p_id: product.id });

  const { data: bumps } = await supabase
    .from("products")
    .select("*")
    .eq("producer_id", product.producer_id)
    .eq("status", "approved")
    .neq("id", product.id)
    .limit(2);

  const hasPromo = product.promo_price != null;

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container grid max-w-5xl gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {product.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.cover_image_url} alt={product.title} className="aspect-video w-full object-cover" />
            )}
            <div className="p-6">
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{product.description}</p>
              {product.video_url && (
                <div className="mt-4 aspect-video overflow-hidden rounded-xl">
                  <iframe src={product.video_url} className="h-full w-full" allowFullScreen />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-lg">
            <p className="text-sm font-medium text-muted-foreground">Resumo da compra</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold">
                {formatCurrency(product.promo_price ?? product.price, product.currency as "MZN" | "ZAR")}
              </p>
              {hasPromo && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.price, product.currency as "MZN" | "ZAR")}
                </p>
              )}
            </div>
            <CheckoutForm product={product} bumps={bumps ?? []} affiliateRef={ref} />
          </div>
        </div>
      </div>
    </div>
  );
}
