import Link from "next/link";
import { Search, ShoppingBag, Instagram, MessageCircle, ImageOff, Star, Flame } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { BecomeAffiliateButton } from "@/components/affiliates/affiliate-actions";
import { getMarketplaceProducts, getMarketplaceCategories, type MarketplaceSort } from "@/lib/data/marketplace";
import { formatCurrency } from "@/lib/utils";

const INSTAGRAM_URL = "https://www.instagram.com/pagaja.co.mz?igsh=MThwNXl1eWx1eGtvcA==";
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/Ga5A5WwQ4EJ9yI8DaR860t?s=cl&p=a&ilr=1&amv=1";

const SORT_OPTIONS: { value: MarketplaceSort; label: string }[] = [
  { value: "vendidos", label: "Mais vendidos" },
  { value: "recentes", label: "Mais recentes" },
  { value: "menor_preco", label: "Menor preço" },
  { value: "maior_preco", label: "Maior preço" },
];

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; ordenar?: MarketplaceSort }>;
}) {
  const { q, categoria, ordenar } = await searchParams;
  const [products, categories] = await Promise.all([
    getMarketplaceProducts({ search: q, categorySlug: categoria, sort: ordenar }),
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
          <Select name="ordenar" defaultValue={ordenar ?? "vendidos"} className="w-44">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const hasPromo = product.promo_price != null;
              const discountPercent = hasPromo
                ? Math.round((1 - (product.promo_price as number) / product.price) * 100)
                : 0;
              return (
              <div key={product.id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                <Link href={`/p/${product.slug}`} className="block">
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {product.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.cover_image_url}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    )}
                    {hasPromo && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Flame className="h-3 w-3" /> -{discountPercent}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    {product.category_name && (
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {product.category_name}
                      </span>
                    )}
                    <p className="mt-0.5 truncate font-semibold">{product.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      por {product.producer_name}
                      {product.producerBadge && (
                        <span
                          title={`Vendedor ${product.producerBadge.label}`}
                          className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600"
                        >
                          {product.producerBadge.icon} {product.producerBadge.label}
                        </span>
                      )}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {product.ratingCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {product.ratingAverage} ({product.ratingCount})
                        </span>
                      )}
                      {product.sales_count > 0 && <span>{product.sales_count} vendas</span>}
                    </div>
                  </div>
                </Link>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className="whitespace-nowrap font-bold">
                      {formatCurrency(product.promo_price ?? product.price, product.currency as "MZN" | "ZAR")}
                    </span>
                    {hasPromo && (
                      <span className="whitespace-nowrap text-xs text-muted-foreground line-through">
                        {formatCurrency(product.price, product.currency as "MZN" | "ZAR")}
                      </span>
                    )}
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
              );
            })}
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
