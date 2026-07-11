"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWithdrawalStatus } from "@/lib/actions/admin";
import type { WithdrawalStatus } from "@/types/database";

export function WithdrawalReviewActions({ withdrawalId, status }: { withdrawalId: string; status: WithdrawalStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState("");

  async function act(newStatus: WithdrawalStatus, note?: string) {
    setPending(true);
    await updateWithdrawalStatus(withdrawalId, newStatus, note);
    setPending(false);
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
