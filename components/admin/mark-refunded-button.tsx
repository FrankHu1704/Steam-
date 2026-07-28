"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markOrderRefunded } from "@/lib/actions/admin";

export function MarkRefundedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (
      !confirm(
        "Marcar este pedido como reembolsado/estornado? Isto desconta o valor do saldo disponível do produtor (pode ficar negativo se já tiver levantado)."
      )
    )
      return;
    setPending(true);
    setError(null);
    const result = await markOrderRefunded(orderId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending} className="gap-1.5">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
        Marcar como Reembolsado
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
