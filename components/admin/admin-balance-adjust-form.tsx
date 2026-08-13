"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminAdjustBalance } from "@/lib/actions/admin";
import { formatCurrency } from "@/lib/utils";

export function AdminBalanceAdjustForm({
  userId,
  currency,
  isCto,
}: {
  userId: string;
  currency: string;
  isCto: boolean;
}) {
  const router = useRouter();
  const [wallet, setWallet] = useState<"producer" | "dev" | "cto">("producer");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!(numericAmount > 0)) {
      toast.error("Indique um valor válido.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Indique o motivo do ajuste.");
      return;
    }
    const signedAmount = direction === "add" ? numericAmount : -numericAmount;
    if (
      !confirm(
        `${direction === "add" ? "Adicionar" : "Retirar"} ${formatCurrency(numericAmount, currency as "MZN" | "ZAR")} ${direction === "add" ? "ao" : "do"} saldo desta conta? Isto altera o saldo diretamente, sem venda ou saque por trás.`
      )
    ) {
      return;
    }
    setPending(true);
    const result = await adminAdjustBalance(userId, wallet, signedAmount, reason);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Saldo ajustado.");
    setAmount("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="balance-wallet">Carteira</Label>
        <Select id="balance-wallet" value={wallet} onChange={(e) => setWallet(e.target.value as "producer" | "dev" | "cto")}>
          <option value="producer">Carteira Produtor</option>
          <option value="dev">Carteira Programador (API)</option>
          {isCto && <option value="cto">Carteira CTO</option>}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="balance-direction">Ação</Label>
          <Select id="balance-direction" value={direction} onChange={(e) => setDirection(e.target.value as "add" | "remove")}>
            <option value="add">Adicionar</option>
            <option value="remove">Retirar</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="balance-amount">Valor ({currency})</Label>
          <Input
            id="balance-amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="balance-reason">Motivo (obrigatório — fica registado e é enviado por email)</Label>
        <Textarea id="balance-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        <Wallet className="mr-1.5 h-3.5 w-3.5" /> Confirmar ajuste
      </Button>
    </form>
  );
}
