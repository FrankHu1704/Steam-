"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDeleteProduct } from "@/lib/actions/admin";

export function AdminDeleteProductButton({ productId, salesCount }: { productId: string; salesCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Apagar este produto como administrador? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    const res = await adminDeleteProduct(productId);
    if (res.error) toast.error(res.error);
    router.refresh();
    setBusy(false);
  }

  return (
    <Button variant="destructive" size="sm" disabled={busy || salesCount > 0} onClick={handleDelete}>
      <Trash2 className="h-3.5 w-3.5" /> Apagar
    </Button>
  );
}
