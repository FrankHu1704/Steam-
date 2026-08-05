"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markPrizeDelivered } from "@/lib/actions/admin";

export function MarkPrizeDeliveredButton({ producerId, tierKey, prizeLabel }: { producerId: string; tierKey: string; prizeLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirm(`Confirmar que "${prizeLabel}" já foi entregue a este produtor?`)) return;
    setPending(true);
    const res = await markPrizeDelivered(producerId, tierKey);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Prémio marcado como entregue.");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
      Marcar como entregue
    </Button>
  );
}
