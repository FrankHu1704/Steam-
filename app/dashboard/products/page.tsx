import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyProducts } from "@/lib/data/products";
import { formatCurrency } from "@/lib/utils";

export default async function ProductsPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const products = await getMyProducts(user.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie o seu catálogo de infoprodutos.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4" /> Novo Produto
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 && (
          <p className="text-muted-foreground">Ainda sem produtos. Crie o primeiro.</p>
        )}
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/products/${p.id}`}
            className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-lg"
          >
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
              {p.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-2">
              <p className="line-clamp-1 font-semibold">{p.title}</p>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1 font-medium">
              {formatCurrency(p.promo_price ?? p.price, p.currency as "MZN" | "ZAR")}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>{p.view_count} visualizações</span>
              <span>{p.sales_count} vendas</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
