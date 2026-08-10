import { Share2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { BecomeAffiliateButton } from "@/components/affiliates/affiliate-actions";
import { CopyLinkButton } from "@/components/affiliates/copy-link-button";
import { getAffiliateMarketplace, getMyAffiliateLinks } from "@/lib/data/affiliates";
import { formatCurrency } from "@/lib/utils";

// Same marketplace already used at /account/affiliates (buyers can also
// become affiliates) — this is just the producer-facing entry point, with
// the exact commission amount shown next to the percentage.
export default async function AffiliateMarketplacePage() {
  const [marketplace, myLinks] = await Promise.all([getAffiliateMarketplace(), getMyAffiliateLinks()]);
  const promotedIds = new Set(myLinks.map((l) => l.product_id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
        <p className="text-sm text-muted-foreground">
          Promova produtos de outros criadores e ganhe comissão por cada venda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> As minhas hiperligações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não é afiliado de nenhum produto.</p>
          ) : (
            <div className="space-y-3">
              {myLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{link.product_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {link.commission_percent}% de comissão · {link.sales} vendas ·{" "}
                      {formatCurrency(link.commission_earned, "MZN")} ganhos
                    </p>
                  </div>
                  <CopyLinkButton path={`/p/${link.product_slug}?ref=${link.code}`} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Produtos disponíveis para afiliação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {marketplace.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto com afiliação ativa no momento.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {marketplace.map((product) => {
                const basePrice = product.promo_price ?? product.price;
                const earnAmount = Math.round(basePrice * (product.affiliate_commission_percent / 100) * 100) / 100;
                return (
                  <div key={product.id} className="rounded-xl border border-border p-4">
                    {product.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.cover_image_url}
                        alt={product.title}
                        className="mb-3 aspect-video w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="font-semibold">{product.title}</p>
                    <p className="text-xs text-muted-foreground">por {product.producer_name}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span>{formatCurrency(basePrice, product.currency as "MZN" | "ZAR")}</span>
                      <StatusBadge status={`${product.affiliate_commission_percent}%`} />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      Ganhas {formatCurrency(earnAmount, product.currency as "MZN" | "ZAR")} por venda
                    </p>
                    <div className="mt-3">
                      {promotedIds.has(product.id) ? (
                        <CopyLinkButton
                          path={`/p/${product.slug}?ref=${myLinks.find((l) => l.product_id === product.id)?.code}`}
                        />
                      ) : (
                        <BecomeAffiliateButton productId={product.id} slug={product.slug} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
