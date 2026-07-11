import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getCategories } from "@/lib/data/products";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-2xl font-bold">Novo Produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fica visível para venda depois da aprovação de um administrador.
      </p>
      <div className="mt-6">
        <ProductForm userId={user.id} categories={categories} />
      </div>
    </div>
  );
}
