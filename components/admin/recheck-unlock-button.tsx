"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkProductionUnlockStatus } from "@/lib/actions/developer";

// Asks the processor directly (GET /payments/{reference}) whether this
// charge actually completed — unlike "Marcar como Pago", this doesn't
// take the admin's word for it, so it's safe to click even if unsure.
export function RecheckUnlockButton({ unlockId }: { unlockId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await checkProductionUnlockStatus(unlockId);
    setPending(false);
    if (res.status === "paid") {
      toast.success("Confirmado como pago!");
    } else if (res.status === "failed") {
      toast.error("O processador reporta esta cobrança como falhada.");
    } else {
      toast.info("Ainda pendente do lado do processador.");
    }
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="ghost" onClick={handleClick} disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Verificar novamente
    </Button>
  );
}
