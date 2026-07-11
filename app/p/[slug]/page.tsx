import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
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
  if (ref) await supabase.rpc("increment_affiliate_clicks", { affiliate_code: ref });

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
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {hasPromo && (
              <div className="flex items-center justify-center gap-1.5 bg-brand-gradient px-4 py-2 text-xs font-semibold text-white">
                <Flame className="h-3.5 w-3.5" />
                Preço promocional por tempo limitado
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                {product.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(product.promo_price ?? product.price, product.currency as "MZN" | "ZAR")}
                    </p>
                    {hasPromo && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatCurrency(product.price, product.currency as "MZN" | "ZAR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <CheckoutForm product={product} bumps={bumps ?? []} affiliateRef={ref} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
