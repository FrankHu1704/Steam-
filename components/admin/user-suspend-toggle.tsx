"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { suspendUser, unsuspendUser } from "@/lib/actions/admin";

export function UserSuspendToggle({
  userId,
  suspended,
  suspensionReason,
}: {
  userId: string;
  suspended: boolean;
  suspensionReason: string | null;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSuspend() {
    setPending(true);
    const result = await suspendUser(userId, reason);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Conta suspensa — o utilizador foi desligado e não consegue voltar a entrar.");
    setShowForm(false);
    router.refresh();
  }

  async function handleUnsuspend() {
    if (!confirm("Reativar esta conta? O utilizador volta a poder iniciar sessão imediatamente.")) return;
    setPending(true);
    const result = await unsuspendUser(userId);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Conta reativada.");
    router.refresh();
  }

  if (suspended) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">
          Conta suspensa{suspensionReason ? ` — ${suspensionReason}` : ""}.
        </p>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleUnsuspend}>
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Reativar conta
        </Button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button type="button" size="sm" variant="destructive" onClick={() => setShowForm(true)}>
        <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Suspender conta
      </Button>
    );
  }

  return (
    <div className="max-w-sm space-y-2">
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo da suspensão (opcional — é enviado por email ao utilizador)"
        rows={2}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={handleSuspend}>
          Confirmar suspensão
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
