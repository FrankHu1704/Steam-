"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { requestWithdrawal } from "@/lib/actions/withdrawals";
import type { PayoutMethod } from "@/types/database";

const METHOD_LABELS: Record<PayoutMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "mKesh",
  bank_transfer: "Transferência Bancária",
};

export function WithdrawalForm({
  balanceAvailable,
  currency,
  feePercent,
  minimumAmount,
}: {
  balanceAvailable: number;
  currency: string;
  feePercent: number;
  minimumAmount: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("mpesa");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const numericAmount = Number(amount) || 0;
  const feeAmount = Math.round(numericAmount * (feePercent / 100) * 100) / 100;
  const netAmount = Math.max(0, numericAmount - feeAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await requestWithdrawal({ amount: numericAmount, payoutMethod, destination });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAmount("");
    setDestination("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="amount">Valor a levantar</Label>
        <Input
          id="amount"
          type="number"
          min={minimumAmount}
          max={balanceAvailable}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Saldo disponível: {formatCurrency(balanceAvailable, currency as "MZN" | "ZAR")} · Mínimo:{" "}
          {formatCurrency(minimumAmount, currency as "MZN" | "ZAR")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payout-method">Método de recebimento</Label>
        <Select id="payout-method" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}>
          {Object.entries(METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destination">
          {payoutMethod === "bank_transfer" ? "IBAN / Conta bancária" : "Número de telemóvel"}
        </Label>
        <Input id="destination" required value={destination} onChange={(e) => setDestination(e.target.value)} />
      </div>

      {numericAmount > 0 && (
        <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Taxa ({feePercent}%)</span>
            <span>-{formatCurrency(feeAmount, currency as "MZN" | "ZAR")}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Vai receber</span>
            <span>{formatCurrency(netAmount, currency as "MZN" | "ZAR")}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending || numericAmount < minimumAmount}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Pedir levantamento
      </Button>
    </form>
  );
}
