import Link from "next/link";
import {
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ImageOff,
  ShieldAlert,
  UserSearch,
  FileSearch,
  FileWarning,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ProductReviewActions } from "@/components/admin/product-review-actions";
import { AdminDeleteProductButton } from "@/components/admin/admin-delete-product-button";
import { getAllProducts } from "@/lib/data/admin";
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

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "pending";
  const products = await getAllProducts(activeStatus || undefined);

  const filters = [
    { label: "Pendentes", value: "pending", icon: Clock },
    { label: "Aprovados", value: "approved", icon: CheckCircle2 },
    { label: "Rejeitados", value: "rejected", icon: XCircle },
    { label: "Todos", value: "", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderação de Produtos</h1>
        <p className="text-sm text-muted-foreground">Aprove ou rejeite produtos submetidos pelos produtores.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <a
            key={f.value}
            href={f.value ? `/admin/products?status=${f.value}` : "/admin/products"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeStatus === f.value
                ? "bg-brand-gradient text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {products.map((product) => {
                const age = accountAgeLabel(product.producer_created_at);
                const flagged = product.status === "pending" && (age.isNew || product.producer_rejected_count > 0);
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
                      <Link
                        href={`/admin/users/${product.producer_id}`}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <UserSearch className="h-3 w-3" /> Rever produtor
                      </Link>
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
                        <ShieldAlert className="h-3.5 w-3.5" /> Reveja o perfil do produtor antes de aprovar.
                      </p>
                    )}
                    {product.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Motivo: {product.rejection_reason}</p>
                    )}
                    {product.status === "approved" && (
                      <Link
                        href={`/p/${product.slug}`}
                        target="_blank"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Ver produto <ExternalLink className="h-3 w-3" />
                      </Link>
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
                    {product.tracking_script && (
                      <details className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs dark:border-amber-900 dark:bg-amber-950">
                        <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                          <ShieldAlert className="h-3.5 w-3.5" /> Este produto tem script personalizado — reveja antes de aprovar
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-black/80 p-2 font-mono text-[11px] text-emerald-300">
                          {product.tracking_script}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={product.status} />
                    {product.status === "pending" && <ProductReviewActions productId={product.id} />}
                    <AdminDeleteProductButton productId={product.id} salesCount={product.sales_count} />
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
