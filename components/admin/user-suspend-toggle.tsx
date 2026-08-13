"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { suspendUser, unsuspendUser, markUserAsFraud } from "@/lib/actions/admin";

export function UserSuspendToggle({
  userId,
  suspended,
  suspensionReason,
  fraudFlag,
}: {
  userId: string;
  suspended: boolean;
  suspensionReason: string | null;
  fraudFlag: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"none" | "suspend" | "fraud">("none");
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
    setMode("none");
    router.refresh();
  }

  async function handleMarkFraud() {
    if (!reason.trim()) {
      toast.error("Indique o motivo da fraude para o registo.");
      return;
    }
    if (
      !confirm(
        "Marcar esta conta como fraude? O saldo disponível (produtor, API e CTO) é perdido permanentemente e NÃO é reembolsado. O acesso só pode ser restaurado por um administrador. Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }
    setPending(true);
    const result = await markUserAsFraud(userId, reason);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Conta marcada como fraude — saldo perdido e acesso bloqueado.");
    setMode("none");
    router.refresh();
  }

  async function handleUnsuspend() {
    if (
      !confirm(
        fraudFlag
          ? "Reativar o acesso desta conta? O saldo já perdido por fraude NÃO é restaurado — só o login volta a funcionar."
          : "Reativar esta conta? O utilizador volta a poder iniciar sessão imediatamente."
      )
    )
      return;
    setPending(true);
    const result = await unsuspendUser(userId);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Acesso reativado.");
    router.refresh();
  }

  if (suspended) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">
          {fraudFlag ? "Conta bloqueada por FRAUDE" : "Conta suspensa"}
          {suspensionReason ? ` — ${suspensionReason}` : ""}.
        </p>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleUnsuspend}>
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Reativar acesso
        </Button>
      </div>
    );
  }

  if (mode === "none") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setMode("suspend")}>
          <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Suspender conta
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => setMode("fraud")}>
          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Marcar como fraude
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-sm space-y-2">
      {mode === "fraud" && (
        <p className="text-xs font-medium text-destructive">
          Isto bloqueia o login e perde permanentemente o saldo disponível desta conta (sem reembolso). Só um
          administrador pode reativar o acesso depois.
        </p>
      )}
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={
          mode === "fraud"
            ? "Motivo da fraude (obrigatório — fica registado e é enviado por email)"
            : "Motivo da suspensão (opcional — é enviado por email ao utilizador)"
        }
        rows={2}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={mode === "fraud" ? handleMarkFraud : handleSuspend}
        >
          {mode === "fraud" ? "Confirmar bloqueio por fraude" : "Confirmar suspensão"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setMode("none")}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
