import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ProductReviewActions } from "@/components/admin/product-review-actions";
import { AdminDeleteProductButton } from "@/components/admin/admin-delete-product-button";
import { getAllProducts } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "pending";
  const products = await getAllProducts(activeStatus || undefined);

  const filters = [
    { label: "Pendentes", value: "pending" },
    { label: "Aprovados", value: "approved" },
    { label: "Rejeitados", value: "rejected" },
    { label: "Todos", value: "" },
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
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              activeStatus === f.value ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          ) : (
            <div className="divide-y divide-border">
              {products.map((product) => (
                <div key={product.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      por {product.producer_name} · {formatCurrency(product.price, product.currency as "MZN" | "ZAR")} ·{" "}
                      {product.sales_count} venda{product.sales_count === 1 ? "" : "s"}
                    </p>
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
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={product.status} />
                    {product.status === "pending" && <ProductReviewActions productId={product.id} />}
                    <AdminDeleteProductButton productId={product.id} salesCount={product.sales_count} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
