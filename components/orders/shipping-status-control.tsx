"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateShippingStatus } from "@/lib/actions/orders";
import type { ShippingStatus } from "@/types/database";

const LABELS: Record<ShippingStatus, string> = {
  pending: "Pendente",
  processing: "Em preparação",
  shipped: "Enviado",
  delivered: "Entregue",
  returned: "Devolvido",
};

export function ShippingStatusControl({
  orderId,
  status,
  trackingReference,
  address,
}: {
  orderId: string;
  status: ShippingStatus | null;
  trackingReference: string | null;
  address: string | null;
}) {
  const [value, setValue] = useState<ShippingStatus>(status ?? "pending");
  const [tracking, setTracking] = useState(trackingReference ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateShippingStatus(orderId, value, tracking || undefined);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Estado de envio atualizado.");
      setOpen(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
      >
        {LABELS[value]}
      </button>
      {open && (
        <div className="min-w-[220px] space-y-2 rounded-lg border border-border bg-card p-3 text-xs">
          {address && <p className="text-muted-foreground">{address}</p>}
          <Select value={value} onChange={(e) => setValue(e.target.value as ShippingStatus)}>
            {Object.entries(LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Código de rastreio (opcional)"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
          <Button type="button" size="sm" className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      )}
    </div>
  );
}
