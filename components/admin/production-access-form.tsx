"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { adminGrantProductionAccess, adminRevokeProductionAccess } from "@/lib/actions/admin";

const DURATION_OPTIONS = [
  { value: "24", label: "1 dia" },
  { value: String(24 * 7), label: "7 dias" },
  { value: String(24 * 30), label: "30 dias" },
  { value: "permanent", label: "Permanente" },
];

export function ProductionAccessForm({ userId, hasAccess }: { userId: string; hasAccess: boolean }) {
  const router = useRouter();
  const [duration, setDuration] = useState("24");
  const [pending, setPending] = useState(false);

  async function handleGrant() {
    setPending(true);
    const hours = duration === "permanent" ? null : Number(duration);
    const res = await adminGrantProductionAccess(userId, hours);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Acesso de produção concedido.");
    router.refresh();
  }

  async function handleRevoke() {
    setPending(true);
    const res = await adminRevokeProductionAccess(userId);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Acesso de produção revogado.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-36" disabled={pending}>
        {DURATION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Button type="button" onClick={handleGrant} disabled={pending} className="gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
        Ativar
      </Button>
      {hasAccess && (
        <Button type="button" variant="outline" onClick={handleRevoke} disabled={pending} className="gap-1.5">
          <Lock className="h-4 w-4" /> Revogar
        </Button>
      )}
    </div>
  );
}
