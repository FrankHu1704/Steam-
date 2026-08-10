import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsGrid } from "@/components/products/products-grid";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyProducts } from "@/lib/data/products";

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
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/products/link/new">
              <Link2 className="h-4 w-4" /> Link de Pagamento
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="h-4 w-4" /> Novo Produto
            </Link>
          </Button>
        </div>
      </div>

      <ProductsGrid products={products} />
    </div>
  );
}
