"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSponsorStatus } from "@/lib/actions/admin";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function UserSponsorForm({
  userId,
  isSponsor,
  sharePercent,
  contractStartedAt,
}: {
  userId: string;
  isSponsor: boolean;
  sharePercent: number | null;
  contractStartedAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [percent, setPercent] = useState(String(sharePercent ?? ""));
  const [startDate, setStartDate] = useState(toDateInputValue(contractStartedAt) || new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    const result = await setSponsorStatus(userId, true, Number(percent), new Date(startDate).toISOString());
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Patrocinador configurado.");
    setEditing(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm("Remover o estatuto de patrocinador desta conta? Deixa de acumular percentagem do lucro a partir de agora.")) return;
    setPending(true);
    const result = await setSponsorStatus(userId, false, null, null);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Patrocinador removido.");
    router.refresh();
  }

  if (isSponsor && !editing) {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-semibold text-primary">{sharePercent}%</span> do lucro líquido mensal da
          plataforma, a contar desde{" "}
          <span className="font-medium">
            {contractStartedAt ? new Date(contractStartedAt).toLocaleDateString("pt-MZ") : "—"}
          </span>
          .
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={handleRemove}>
            Remover patrocinador
          </Button>
        </div>
      </div>
    );
  }

  if (editing || !isSponsor) {
    return (
      <div className="max-w-sm space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sponsor-percent">Percentagem (%)</Label>
            <Input
              id="sponsor-percent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sponsor-start">Início do contrato</Label>
            <Input id="sponsor-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Só começa a ganhar (ou a contar) a partir desta data — lucro gerado antes não conta para o patrocinador,
          mesmo dentro do mesmo mês.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
            <Handshake className="mr-1.5 h-3.5 w-3.5" /> Guardar
          </Button>
          {editing && (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
