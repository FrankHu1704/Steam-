"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getKycDocumentUrls, approveKycSubmission, rejectKycSubmission } from "@/lib/actions/admin";
import type { Profile } from "@/types/database";

export function KycReview({ account }: { account: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | "load" | null>(null);
  const [docs, setDocs] = useState<{ frontUrl: string | null; backUrl: string | null } | null>(null);

  async function handleLoadDocuments() {
    setPending("load");
    const res = await getKycDocumentUrls(account.id);
    setPending(null);
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    setDocs(res as { frontUrl: string | null; backUrl: string | null });
  }

  async function handleApprove() {
    setPending("approve");
    const res = await approveKycSubmission(account.id);
    setPending(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Verificação aprovada.");
    router.refresh();
  }

  async function handleReject() {
    const reason = prompt("Motivo da rejeição (obrigatório):");
    if (!reason || !reason.trim()) return;
    setPending("reject");
    const res = await rejectKycSubmission(account.id, reason);
    setPending(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Verificação rejeitada.");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{account.name}</p>
          <p className="text-xs text-muted-foreground">
            {account.email} · {account.phone ?? "sem telefone"} · enviado em{" "}
            {account.kyc_submitted_at ? new Date(account.kyc_submitted_at).toLocaleString("pt-MZ") : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!docs && (
            <Button type="button" size="sm" variant="outline" onClick={handleLoadDocuments} disabled={pending !== null} className="gap-1.5">
              {pending === "load" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Ver documentos
            </Button>
          )}
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

      {docs && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Frente</p>
            {docs.frontUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={docs.frontUrl} alt="Documento — frente" className="w-full rounded-lg border border-border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Não disponível.</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Verso</p>
            {docs.backUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={docs.backUrl} alt="Documento — verso" className="w-full rounded-lg border border-border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Não disponível.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
