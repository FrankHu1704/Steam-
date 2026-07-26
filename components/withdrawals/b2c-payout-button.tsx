"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestSelfServiceB2CPayout } from "@/lib/actions/withdrawals";

export function B2CPayoutButton({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await requestSelfServiceB2CPayout(withdrawalId);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Levantamento pago instantaneamente via B2C!");
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
      Levantar agora (B2C)
    </Button>
  );
}
