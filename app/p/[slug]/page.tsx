import { notFound } from "next/navigation";
import { Flame, ImageOff } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StarRating } from "@/components/reviews/star-rating";
import { TrackingScriptInjector } from "@/components/products/tracking-script-injector";
import { buildPixelScripts } from "@/lib/pixels";
import { getActivePaymentProvider, methodsForProvider } from "@/lib/payments";
import { getProductReviews, getProductRatingSummary } from "@/lib/data/reviews";
import { resolveAccentColor } from "@/lib/checkout-theme";
import { cn, formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductSearchParams {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export default async function ProductSalePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ProductSearchParams>;
}) {
  const { slug } = await params;
  const { ref, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = await searchParams;
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

  let bumps: Product[] = [];
  if (product.bump_enabled) {
    const { data: bumpOffers } = await supabase
      .from("product_bump_offers")
      .select("sort_order, bump_product:bump_product_id(*)")
      .eq("product_id", product.id)
      .order("sort_order");
    bumps = ((bumpOffers ?? []) as unknown as { bump_product: Product | null }[])
      .map((o) => o.bump_product)
      .filter((p): p is Product => p != null && p.status === "approved");
  }

  const [reviews, ratingSummary] = await Promise.all([
    getProductReviews(product.id),
    getProductRatingSummary(product.id),
  ]);

  const hasPromo = product.promo_price != null;
  const accentColor = product.is_payment_link ? resolveAccentColor(product.checkout_accent_color) : null;

  const pixelScripts = buildPixelScripts({
    facebookPixelId: product.facebook_pixel_id,
    tiktokPixelId: product.tiktok_pixel_id,
    googleAnalyticsId: product.google_analytics_id,
    customScript: product.tracking_script,
  });

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      {pixelScripts && <TrackingScriptInjector html={pixelScripts} />}
      <div className="container grid max-w-5xl gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {product.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.cover_image_url} alt={product.title} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-muted">
                <ImageOff className="h-10 w-10 text-muted-foreground" />
              </div>
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
                {product.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p
                      className={cn("whitespace-nowrap text-lg font-bold", !accentColor && "text-primary")}
                      style={accentColor ? { color: accentColor } : undefined}
                    >
                      {formatCurrency(product.promo_price ?? product.price, product.currency as "MZN" | "ZAR")}
                    </p>
                    {hasPromo && (
                      <>
                        <p className="whitespace-nowrap text-xs text-muted-foreground line-through">
                          {formatCurrency(product.price, product.currency as "MZN" | "ZAR")}
                        </p>
                        <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          -{Math.round((1 - (product.promo_price as number) / product.price) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <CheckoutForm
                product={product}
                bumps={bumps ?? []}
                affiliateRef={ref}
                paymentMethods={paymentMethods}
                utm={{ source: utm_source, medium: utm_medium, campaign: utm_campaign, content: utm_content, term: utm_term }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
