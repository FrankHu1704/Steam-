"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { Trash2, Plus, Loader2, Tag, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory, deleteCategory } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types/database";

function categoryIcon(icon: string | null): LucideIcon {
  if (!icon) return Tag;
  const pascal = icon
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return (Icons as unknown as Record<string, LucideIcon>)[pascal] ?? Tag;
}

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
        {categories.map((category) => {
          const Icon = categoryIcon(category.icon);
          return (
            <div key={category.id} className="flex items-center justify-between p-3 text-sm">
              <span className="flex items-center gap-2.5 font-medium">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {category.name}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(category.id)}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
