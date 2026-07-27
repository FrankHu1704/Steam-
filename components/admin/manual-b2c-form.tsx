"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { sendManualB2CPayout } from "@/lib/actions/admin";

export function ManualB2CForm() {
  const router = useRouter();
  const [method, setMethod] = useState<"mpesa" | "emola">("mpesa");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Enviar ${amount} MT via B2C (${method}) para ${destination}? Isto move dinheiro real de imediato.`)) return;
    setPending(true);
    const res = await sendManualB2CPayout({ method, destination, amount: Number(amount), note: note || undefined });
    setPending(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Pagamento enviado — ref. ${res.reference ?? "—"}.`);
      setDestination("");
      setAmount("");
      setNote("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="b2c-method">Método</Label>
          <Select id="b2c-method" value={method} onChange={(e) => setMethod(e.target.value as "mpesa" | "emola")}>
            <option value="mpesa">M-Pesa (instantâneo)</option>
            <option value="emola">e-Mola (manual no ZumboPay)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="b2c-amount">Valor (MT)</Label>
          <Input
            id="b2c-amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="b2c-destination">Número de destino</Label>
        <Input
          id="b2c-destination"
          placeholder="84xxxxxxx"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="b2c-note">Nota (opcional)</Label>
        <Input id="b2c-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo do pagamento" />
      </div>
      <p className="text-xs text-muted-foreground">
        Para pagamentos avulsos (reembolsos, correções, bónus) — não associados a um pedido de levantamento.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar B2C
      </Button>
    </form>
  );
}
