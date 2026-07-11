"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProduct, toggleProductStatus } from "@/lib/actions/products";
import type { Product } from "@/types/database";

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const saleLink =
    typeof window !== "undefined" ? `${window.location.origin}/p/${product.slug}` : `/p/${product.slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(saleLink);
    toast.success("Link copiado!");
  }

  async function handleToggle() {
    setBusy(true);
    const res = await toggleProductStatus(product.id, product.status === "approved" ? "paused" : "approved");
    if (res.error) toast.error(res.error);
    router.refresh();
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm("Apagar este produto? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    const res = await deleteProduct(product.id);
    if (res.error) {
      toast.error(res.error);
      setBusy(false);
    } else {
      router.push("/dashboard/products");
    }
  }

  return (
    <div className="flex gap-2">
      {product.status === "approved" && (
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="h-4 w-4" /> Copiar Link
        </Button>
      )}
      {(product.status === "approved" || product.status === "paused") && (
        <Button variant="outline" size="sm" disabled={busy} onClick={handleToggle}>
          {product.status === "approved" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {product.status === "approved" ? "Pausar" : "Reativar"}
        </Button>
      )}
      <Button variant="destructive" size="sm" disabled={busy || product.sales_count > 0} onClick={handleDelete}>
        <Trash2 className="h-4 w-4" /> Apagar
      </Button>
    </div>
  );
}
