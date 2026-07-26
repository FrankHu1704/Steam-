import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StarRating } from "@/components/reviews/star-rating";
import { getActivePaymentProvider, methodsForProvider } from "@/lib/payments";
import { getProductReviews, getProductRatingSummary } from "@/lib/data/reviews";
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

  const providerName = await getActivePaymentProvider();
  const paymentMethods = methodsForProvider(providerName, product.currency);

  const { data: bumps } = await supabase
    .from("products")
    .select("*")
    .eq("producer_id", product.producer_id)
    .eq("status", "approved")
    .neq("id", product.id)
    .limit(2);

  const [reviews, ratingSummary] = await Promise.all([
    getProductReviews(product.id),
    getProductRatingSummary(product.id),
  ]);

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

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Avaliações</h2>
              {ratingSummary.count > 0 && (
                <div className="flex items-center gap-1.5">
                  <StarRating value={ratingSummary.average} />
                  <span className="text-sm text-muted-foreground">
                    {ratingSummary.average} · {ratingSummary.count} avaliação{ratingSummary.count === 1 ? "" : "ões"}
                  </span>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Ainda não há avaliações para este produto.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{review.buyer_name}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("pt-MZ")}
                      </span>
                    </div>
                    <StarRating value={review.rating} size="h-3.5 w-3.5" />
                    {review.comment && <p className="mt-1.5 text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
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
              <CheckoutForm product={product} bumps={bumps ?? []} affiliateRef={ref} paymentMethods={paymentMethods} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
