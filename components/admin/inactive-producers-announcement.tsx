"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendInstantWithdrawalAnnouncementToInactiveProducers } from "@/lib/actions/admin";

export function InactiveProducersAnnouncement({ count }: { count: number }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  async function handleSend() {
    if (!confirm(`Enviar o email de "Saques instantâneos" para ${count} conta(s) sem produtos ou vendas?`)) return;
    setPending(true);
    const res = await sendInstantWithdrawalAnnouncementToInactiveProducers();
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSent(res.sent ?? 0);
    toast.success(`Email enviado a ${res.sent ?? 0} conta(s).`);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Anuncia os saques instantâneos e sugere criar um produto de teste de 20 MT, só para contas de produtor que
        ainda não têm nenhuma venda registada.
      </p>
      <Button type="button" onClick={handleSend} disabled={pending || count === 0} className="gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
        Enviar a {count} conta{count === 1 ? "" : "s"} sem vendas
      </Button>
      {sent != null && <p className="text-xs text-emerald-600">Enviado a {sent} conta(s).</p>}
    </div>
  );
}
