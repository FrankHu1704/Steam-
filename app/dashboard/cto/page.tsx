import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, LayoutGrid, ImageOff, ShieldAlert, FileSearch, FileWarning, ExternalLink, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProductReviewActions } from "@/components/admin/product-review-actions";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getAllProducts } from "@/lib/data/admin";
import { getCtoDashboardData } from "@/lib/cto";
import { cn, formatCurrency } from "@/lib/utils";

const NEW_ACCOUNT_DAYS = 7;

function accountAgeLabel(createdAt: string | null): { label: string; isNew: boolean } {
  if (!createdAt) return { label: "conta desconhecida", isNew: false };
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  const isNew = days < NEW_ACCOUNT_DAYS;
  if (days === 0) return { label: "conta criada hoje", isNew };
  if (days === 1) return { label: "conta criada há 1 dia", isNew };
  return { label: `conta criada há ${days} dias`, isNew };
}

export default async function CtoPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login?next=/dashboard/cto");
  if (!profile.is_cto) redirect("/dashboard");

  const [products, earnings] = await Promise.all([getAllProducts("pending"), getCtoDashboardData(user.id)]);
  const currency = profile.currency as "MZN" | "ZAR";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel CTO</h1>
        <p className="text-sm text-muted-foreground">Aprove produtos e acompanhe os seus {earnings.sharePercent}% do lucro da plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl bg-amber-600 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-2 text-sm font-medium text-white/80">
            <Wallet className="h-4 w-4" /> Saldo disponível para levantamento
          </div>
          <p className="relative mt-2 text-3xl font-bold sm:text-4xl">{formatCurrency(earnings.balanceAvailable, currency)}</p>
          <p className="relative mt-1 text-xs text-white/70">
            Creditado automaticamente todo dia 1 (25% do lucro do mês anterior).{" "}
            <Link href="/dashboard/withdrawals" className="underline">
              Pedir levantamento
            </Link>
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-2 text-sm font-medium text-white/80">
            <TrendingUp className="h-4 w-4" /> Estimativa deste mês (até agora)
          </div>
          <p className="relative mt-2 text-3xl font-bold sm:text-4xl">{formatCurrency(earnings.thisMonthEstimate, currency)}</p>
          <p className="relative mt-1 text-xs text-white/70">Só entra no saldo levantável no dia 1 do próximo mês.</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-1.5 font-semibold">
          <Clock className="h-4 w-4" /> Produtos pendentes de aprovação
        </h2>
        <Card>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum produto pendente.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.map((product) => {
                  const age = accountAgeLabel(product.producer_created_at);
                  const flagged = age.isNew || product.producer_rejected_count > 0;
                  return (
                    <div key={product.id} className="flex flex-wrap items-center gap-4 p-4">
                      {product.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.cover_image_url}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          {product.title}
                          {product.is_payment_link && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Link de pagamento
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          por {product.producer_name} · {formatCurrency(product.price, product.currency as "MZN" | "ZAR")} ·{" "}
                          {product.sales_count} venda{product.sales_count === 1 ? "" : "s"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className={cn(age.isNew ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                            {age.label}
                          </span>
                          {product.producer_rejected_count > 0 && (
                            <span className="font-medium text-destructive">
                              {product.producer_rejected_count} produto{product.producer_rejected_count === 1 ? "" : "s"}{" "}
                              rejeitado{product.producer_rejected_count === 1 ? "" : "s"} antes
                            </span>
                          )}
                        </div>
                        {flagged && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <ShieldAlert className="h-3.5 w-3.5" /> Reveja com atenção antes de aprovar.
                          </p>
                        )}
                        <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2 text-xs">
                          <p className="mb-1 flex items-center gap-1.5 font-semibold text-muted-foreground">
                            <FileSearch className="h-3.5 w-3.5" /> Ficheiro/link entregue ao comprador
                          </p>
                          {product.files.length === 0 ? (
                            <p className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <FileWarning className="h-3.5 w-3.5" /> Nenhum ficheiro ou link submetido ainda.
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {product.files.map((file) => (
                                <li key={file.id} className="flex items-center justify-between gap-2">
                                  <span className="truncate text-muted-foreground">{file.name}</span>
                                  {file.url ? (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
                                    >
                                      {file.isExternal ? "Abrir link" : "Ver ficheiro"} <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="shrink-0 text-destructive">indisponível</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <ProductReviewActions productId={product.id} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
