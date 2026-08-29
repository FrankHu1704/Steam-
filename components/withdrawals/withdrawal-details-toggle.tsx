"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola" };

export function WithdrawalDetailsToggle({
  amount,
  feeAmount,
  netAmount,
  currency,
  payoutMethod,
  destination,
  withdrawalId,
  payoutReference,
}: {
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: "MZN" | "ZAR";
  payoutMethod: string;
  destination: string;
  withdrawalId: string;
  payoutReference: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Same short, human-readable stand-in for the internal UUID used in the
  // approval email — keeps the reference shown here consistent with what
  // the producer already saw in their inbox.
  const reference = withdrawalId.replace(/-/g, "").slice(0, 11);

  return (
    <div className="text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Detalhes {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <Row label="Valor Solicitado" value={formatCurrency(amount, currency)} />
          {feeAmount > 0 && <Row label="Taxa de Levantamento" value={`-${formatCurrency(feeAmount, currency)}`} />}
          <Row label="Valor Recebido" value={formatCurrency(netAmount, currency)} emphasize />
          <Row label="Método" value={METHOD_LABEL[payoutMethod] ?? payoutMethod.toUpperCase()} />
          <Row label="Destinatário" value={destination} />
          <Row label="Referência" value={reference} />
          {payoutReference && <Row label="ID da Transação" value={payoutReference} />}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasize ? "font-semibold" : "font-mono"}>{value}</span>
    </div>
  );
}
