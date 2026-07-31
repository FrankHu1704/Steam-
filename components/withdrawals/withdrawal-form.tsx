"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import { requestWithdrawal } from "@/lib/actions/withdrawals";
import type { PayoutMethod, PayoutWallet } from "@/types/database";

const METHOD_LABELS: Record<PayoutMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "mKesh",
  bank_transfer: "Transferência Bancária",
};

const WALLET_LOGO: Record<"mpesa" | "emola", string> = {
  mpesa: "/payment-logos/mpesa.png",
  emola: "/payment-logos/emola.png",
};

export function WithdrawalForm({
  balanceAvailable,
  balanceAvailableDev,
  currency,
  feePercent,
  minimumAmount,
  wallets,
}: {
  balanceAvailable: number;
  balanceAvailableDev: number;
  currency: string;
  feePercent: number;
  minimumAmount: number;
  wallets: PayoutWallet[];
}) {
  const router = useRouter();
  const defaultWallet = wallets.find((w) => w.is_default) ?? wallets[0] ?? null;

  const [walletSource, setWalletSource] = useState<"producer" | "dev">("producer");
  const [amount, setAmount] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(defaultWallet?.id ?? null);
  const [useOther, setUseOther] = useState(wallets.length === 0);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("mkesh");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const currentBalance = walletSource === "dev" ? balanceAvailableDev : balanceAvailable;
  const numericAmount = Number(amount) || 0;
  const feeAmount = Math.round(numericAmount * (feePercent / 100) * 100) / 100;
  const netAmount = Math.max(0, numericAmount - feeAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let method: PayoutMethod;
    let dest: string;
    if (useOther) {
      method = payoutMethod;
      dest = destination;
    } else {
      const wallet = wallets.find((w) => w.id === selectedWalletId);
      if (!wallet) {
        setError("Escolha uma carteira.");
        return;
      }
      method = wallet.method;
      dest = wallet.phone;
    }

    setPending(true);
    const result = await requestWithdrawal({
      amount: numericAmount,
      payoutMethod: method,
      destination: dest,
      walletSource,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.instant) {
      toast.success("Levantamento pago instantaneamente!");
    } else {
      toast.success("Levantamento pedido — a aguardar confirmação.");
    }
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Carteira</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setWalletSource("producer")}
            className={cn(
              "rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
              walletSource === "producer" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <p className="text-xs text-muted-foreground">Produtor</p>
            <p className="font-semibold">{formatCurrency(balanceAvailable, currency as "MZN" | "ZAR")}</p>
          </button>
          <button
            type="button"
            onClick={() => setWalletSource("dev")}
            className={cn(
              "rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
              walletSource === "dev" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <p className="text-xs text-muted-foreground">Programador (API)</p>
            <p className="font-semibold">{formatCurrency(balanceAvailableDev, currency as "MZN" | "ZAR")}</p>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Valor a levantar</Label>
        <Input
          id="amount"
          type="number"
          min={minimumAmount}
          max={currentBalance}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Saldo disponível: {formatCurrency(currentBalance, currency as "MZN" | "ZAR")} · Mínimo:{" "}
          {formatCurrency(minimumAmount, currency as "MZN" | "ZAR")}
        </p>
      </div>

      {wallets.length > 0 && !useOther && (
        <div className="space-y-1.5">
          <Label>Carteira de destino</Label>
          <div className="grid gap-2">
            {wallets.map((wallet) => {
              const selected = selectedWalletId === wallet.id;
              return (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => setSelectedWalletId(wallet.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={WALLET_LOGO[wallet.method]}
                      alt={METHOD_LABELS[wallet.method]}
                      width={56}
                      height={24}
                      className="h-6 w-auto object-contain"
                    />
                    <p className="text-xs text-muted-foreground">
                      {wallet.holder_name} · +258 {wallet.phone}
                    </p>
                  </div>
                  {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setUseOther(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Usar outro método (mKesh / Transferência Bancária)
          </button>
        </div>
      )}

      {(wallets.length === 0 || useOther) && (
        <>
          {wallets.length > 0 && (
            <button
              type="button"
              onClick={() => setUseOther(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              ← Usar uma carteira guardada
            </button>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="payout-method">Método de recebimento</Label>
            <Select
              id="payout-method"
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
            >
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
        </>
      )}

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
