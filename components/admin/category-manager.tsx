"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory, deleteCategory } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types/database";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createCategory(name, slugify(name));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    setPending(true);
    setError(null);
    const result = await deleteCategory(id);
    setPending(false);
    if (result.error) {
      setError("Não é possível remover: existem produtos nesta categoria.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="divide-y divide-border rounded-lg border border-border">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between p-3 text-sm">
            <span className="font-medium">{category.name}</span>
            <button
              type="button"
              onClick={() => handleDelete(category.id)}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
