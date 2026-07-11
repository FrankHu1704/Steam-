import { Card, CardContent } from "@/components/ui/card";
import { CategoryManager } from "@/components/admin/category-manager";
import { getAllCategories } from "@/lib/data/admin";

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorias</h1>
        <p className="text-sm text-muted-foreground">Geridas categorias de produtos disponíveis na plataforma.</p>
      </div>

      <Card className="max-w-lg">
        <CardContent className="p-6">
          <CategoryManager categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
