"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveProduct, rejectProduct } from "@/lib/actions/admin";

export function ProductReviewActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    setPending(true);
    await approveProduct(productId);
    setPending(false);
    router.refresh();
  }

  async function handleReject() {
    setPending(true);
    await rejectProduct(productId, reason);
    setPending(false);
    setRejecting(false);
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
          placeholder="Motivo da rejeição"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button size="sm" variant="destructive" onClick={handleReject} disabled={pending}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleApprove} disabled={pending}>
        <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={pending}>
        <X className="mr-1.5 h-3.5 w-3.5" /> Rejeitar
      </Button>
    </div>
  );
}
