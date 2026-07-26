"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWithdrawalStatus, payWithdrawalViaZumboPay } from "@/lib/actions/admin";
import type { PayoutMethod, WithdrawalStatus } from "@/types/database";

export function WithdrawalReviewActions({
  withdrawalId,
  status,
  payoutMethod,
}: {
  withdrawalId: string;
  status: WithdrawalStatus;
  payoutMethod: PayoutMethod;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState("");

  async function act(newStatus: WithdrawalStatus, note?: string) {
    setPending(true);
    await updateWithdrawalStatus(withdrawalId, newStatus, note);
    setPending(false);
    router.refresh();
  }

  async function handleAutoPayout() {
    setPending(true);
    const res = await payWithdrawalViaZumboPay(withdrawalId);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Pago automaticamente via ZumboPay!");
    router.refresh();
  }

  if (status === "pending") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => act("approved")} disabled={pending}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Aprovar
        </Button>
        <Button size="sm" variant="outline" onClick={() => act("rejected", "Rejeitado pelo administrador")} disabled={pending}>
          Rejeitar
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {payoutMethod === "mpesa" && (
          <Button size="sm" variant="outline" onClick={handleAutoPayout} disabled={pending} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Pagar via ZumboPay
          </Button>
        )}
        <Input
          className="h-9 w-40"
          placeholder="Referência"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Button size="sm" onClick={() => act("paid", reference)} disabled={pending}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Marcar como pago
        </Button>
      </div>
    );
  }

  return null;
}
