"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { requestDebtPayment, checkDebtPaymentStatus, remindDebt } from "@/lib/actions/debt";
import { formatCurrency } from "@/lib/utils";

type Method = "mpesa" | "emola";

const METHODS: { value: Method; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "e-Mola" },
];

export function DebtCard({ debtAmount, currency, phone }: { debtAmount: number; currency: "MZN" | "ZAR"; phone: string | null }) {
  const [paying, setPaying] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [method, setMethod] = useState<Method>("mpesa");
  const [payPhone, setPayPhone] = useState(phone ?? "");
  const [showForm, setShowForm] = useState(false);
  const [paid, setPaid] = useState(false);

  async function pollDebtPayment(debtPaymentId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const res = await checkDebtPaymentStatus(debtPaymentId);
      if (res.status === "paid") {
        setPaying(false);
        setPaid(true);
        toast.success("Dívida paga com sucesso!");
        return;
      }
      if (res.status === "failed") {
        setPaying(false);
        toast.error("Pagamento não confirmado. Tente novamente.");
        return;
      }
    }
    setPaying(false);
  }

  async function handlePay() {
    if (!payPhone.trim()) {
      toast.error("Indique o número de telemóvel.");
      return;
    }
    setPaying(true);
    const res = await requestDebtPayment(payPhone.trim(), method);
    if (res.error || !res.debtPaymentId) {
      setPaying(false);
      toast.error(res.error ?? "Falha ao iniciar o pagamento.");
      return;
    }
    toast.info(`Confirme o pagamento de ${formatCurrency(debtAmount, currency)} no seu telemóvel (${METHODS.find((m) => m.value === method)?.label}).`);
    void pollDebtPayment(res.debtPaymentId);
  }

  async function handleRemind() {
    setReminding(true);
    const res = await remindDebt();
    setReminding(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Enviámos um lembrete por email e SMS.");
  }

  if (paid) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-destructive">
            Saldo negativo — {formatCurrency(debtAmount, currency)} em dívida
          </p>
          <p className="mt-1 text-sm text-destructive/90">
            Este valor é descontado automaticamente das suas próximas vendas. Pode regularizar agora mesmo.
          </p>
        </div>
      </div>

      {!showForm ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="destructive" size="sm" onClick={() => setShowForm(true)}>
            Pagar Dívida
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleRemind} disabled={reminding}>
            {reminding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Lembrar-me
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Method)} disabled={paying}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <input
              type="tel"
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              placeholder="84xxxxxxx"
              disabled={paying}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={handlePay} disabled={paying}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" />}
              Pagar {formatCurrency(debtAmount, currency)}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={paying}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
