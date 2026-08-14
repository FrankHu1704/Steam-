"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveProducerAccount, rejectProducerAccount } from "@/lib/actions/admin";
import type { Profile } from "@/types/database";

export function ProducerApprovalReview({ account }: { account: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setPending("approve");
    const res = await approveProducerAccount(account.id);
    setPending(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Conta aprovada — email de boas-vindas enviado.");
    router.refresh();
  }

  async function handleReject() {
    const reason = prompt("Motivo da rejeição (obrigatório):");
    if (!reason || !reason.trim()) return;
    setPending("reject");
    const res = await rejectProducerAccount(account.id, reason);
    setPending(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Pedido rejeitado.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
      <div>
        <p className="font-semibold">{account.name}</p>
        <p className="text-xs text-muted-foreground">
          {account.email} · {account.phone ?? "sem telefone"} · pediu em{" "}
          {new Date(account.created_at).toLocaleDateString("pt-MZ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={handleApprove} disabled={pending !== null} className="gap-1.5">
          {pending === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Aprovar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleReject} disabled={pending !== null} className="gap-1.5">
          {pending === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Rejeitar
        </Button>
      </div>
    </div>
  );
}
