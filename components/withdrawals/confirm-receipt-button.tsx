"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmWithdrawalReceipt } from "@/lib/actions/withdrawals";

export function ConfirmReceiptButton({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await confirmWithdrawalReceipt(withdrawalId);
    setPending(false);
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending}>
      {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
      Confirmar Recebimento
    </Button>
  );
}
