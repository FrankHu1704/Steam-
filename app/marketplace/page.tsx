import Link from "next/link";
import { Search, ShoppingBag, Instagram, MessageCircle } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { BecomeAffiliateButton } from "@/components/affiliates/affiliate-actions";
import { getMarketplaceProducts, getMarketplaceCategories } from "@/lib/data/marketplace";
import { formatCurrency } from "@/lib/utils";

const INSTAGRAM_URL = "https://www.instagram.com/pagaja.co.mz?igsh=MThwNXl1eWx1eGtvcA==";
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/Ga5A5WwQ4EJ9yI8DaR860t?s=cl&p=a&ilr=1&amv=1";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const { q, categoria } = await searchParams;
  const [products, categories] = await Promise.all([
    getMarketplaceProducts({ search: q, categorySlug: categoria }),
    getMarketplaceCategories(),
  ]);

  return (
    <div>
      <SiteNav />
      <div className="container py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Descubra produtos digitais de outros criadores — e torne-se afiliado para ganhar comissão.
            </p>
          </div>
        </div>

        <form action="/marketplace" method="GET" className="mb-8 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q ?? ""} placeholder="Pesquisar produtos…" className="pl-9" />
          </div>
          <Select name="categoria" defaultValue={categoria ?? ""} className="w-48">
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>

        {products.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                <Link href={`/p/${product.slug}`} className="block">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                    {product.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.cover_image_url}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="mt-3">
                    {product.category_name && (
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {product.category_name}
                      </span>
                    )}
                    <p className="mt-0.5 truncate font-semibold">{product.title}</p>
                    <p className="text-xs text-muted-foreground">por {product.producer_name}</p>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold">
                    {formatCurrency(product.promo_price ?? product.price, product.currency as "MZN" | "ZAR")}
                  </span>
                  {product.affiliate_enabled && (
                    <StatusBadge status={`${product.affiliate_commission_percent}% comissão`} />
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/p/${product.slug}`}>Ver produto</Link>
                  </Button>
                </div>
                {product.affiliate_enabled && (
                  <div className="mt-2">
                    <BecomeAffiliateButton productId={product.id} slug={product.slug} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-gradient p-6 text-white">
          <div>
            <p className="font-semibold">Fica por dentro das novidades da PagaJá</p>
            <p className="text-sm text-white/80">Segue-nos no Instagram e entra no grupo do WhatsApp da comunidade.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-4 w-4" /> Seguir no Instagram
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Entrar no grupo
              </a>
            </Button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
