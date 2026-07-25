"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markOrderPaid } from "@/lib/actions/admin";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Confirma que este pagamento foi mesmo recebido? Isto credita o saldo do produtor imediatamente.")) return;
    setPending(true);
    setError(null);
    const result = await markOrderPaid(orderId);
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
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
        Marcar como Pago
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
