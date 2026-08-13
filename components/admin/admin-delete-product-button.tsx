"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDeleteProduct, adminSetProductStatus } from "@/lib/actions/admin";

export function AdminDeleteProductButton({
  productId,
  salesCount,
  status,
}: {
  productId: string;
  salesCount: number;
  status: string;
}) {
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

  // A product with any order history (even failed/pending) can't be
  // hard-deleted — the database's own foreign key would reject it, and
  // deleting the orders too would erase real sales records. Pausing takes
  // it off checkout immediately without touching that history, so this is
  // the admin-side equivalent of the producer's own "Pausar" button —
  // useful right after suspending a producer who can no longer pause it
  // themselves.
  if (salesCount > 0) {
    const paused = status === "paused";

    async function handleToggle() {
      setBusy(true);
      const res = await adminSetProductStatus(productId, paused ? "approved" : "paused");
      if (res.error) toast.error(res.error);
      else toast.success(paused ? "Produto reativado." : "Produto pausado — deixou de estar disponível para compra.");
      router.refresh();
      setBusy(false);
    }

    return (
      <Button variant={paused ? "outline" : "destructive"} size="sm" disabled={busy} onClick={handleToggle}>
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        {paused ? "Reativar" : "Pausar"}
      </Button>
    );
  }

  return (
    <Button variant="destructive" size="sm" disabled={busy} onClick={handleDelete}>
      <Trash2 className="h-3.5 w-3.5" /> Apagar
    </Button>
  );
}
