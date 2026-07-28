"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveEmployeeApplication, rejectEmployeeApplication } from "@/lib/actions/employee-applications";
import type { EmployeeApplication } from "@/types/database";

export function EmployeeApplicationReview({ application }: { application: EmployeeApplication }) {
  const router = useRouter();
  const [commissionPercent, setCommissionPercent] = useState("5");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setPending("approve");
    const res = await approveEmployeeApplication(application.id, Number(commissionPercent));
    setPending(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Colaborador aprovado — email de boas-vindas enviado.");
    router.refresh();
  }

  async function handleReject() {
    const reason = prompt("Motivo da rejeição (opcional):") ?? undefined;
    setPending("reject");
    const res = await rejectEmployeeApplication(application.id, reason);
    setPending(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Candidatura rejeitada.");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{application.name}</p>
          <p className="text-xs text-muted-foreground">{application.email} · {application.phone}</p>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(application.created_at).toLocaleDateString("pt-MZ")}</p>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>BI: {application.bi_number}</p>
        <p>
          {application.address}, {application.city}, {application.province}
        </p>
        {application.mpesa_number && <p>M-Pesa: {application.mpesa_number}</p>}
        {application.emola_number && <p>e-Mola: {application.emola_number}</p>}
      </div>
      {application.message && <p className="rounded-lg bg-muted/40 p-3 text-sm">{application.message}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min="1"
          max="90"
          step="0.5"
          value={commissionPercent}
          onChange={(e) => setCommissionPercent(e.target.value)}
          className="h-9 w-24"
          title="Comissão (%)"
        />
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
