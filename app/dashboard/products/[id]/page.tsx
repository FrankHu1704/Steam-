import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getCategories, getProductForOwner } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/product-form";
import { ProductActions } from "@/components/products/product-actions";
import { StatusBadge } from "@/components/ui/badge";
import type { ProductFile } from "@/types/database";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const product = await getProductForOwner(id, user.id);
  if (!product) redirect("/dashboard/products");

  const categories = await getCategories();
  const supabase = await createClient();
  const { data: files } = await supabase
    .from("product_files")
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <StatusBadge status={product.status} />
          </div>
          {product.rejection_reason && (
            <p className="mt-1 text-sm text-destructive">Motivo: {product.rejection_reason}</p>
          )}
        </div>
        <ProductActions product={product} />
      </div>

      <div className="mt-8">
        <ProductForm
          userId={user.id}
          categories={categories}
          product={product}
          existingFiles={(files as ProductFile[]) ?? []}
        />
      </div>
    </div>
  );
}
