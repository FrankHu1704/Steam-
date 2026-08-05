"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface TotpFactor {
  id: string;
  status: string;
}

export function TwoFactorSettings() {
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<TotpFactor | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const supabase = createClient();

  async function loadFactors() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified") ?? null;
    setFactor(verified);
    setLoading(false);
  }

  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartEnroll() {
    setPending(true);
    // Supabase caps how many unverified TOTP factors an account can hold —
    // clear out any abandoned attempt from before starting a new one.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const unverified = existing?.totp?.find((f) => f.status === "unverified");
    if (unverified) await supabase.auth.mfa.unenroll({ factorId: unverified.id });

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setPending(false);
    if (error || !data || data.type !== "totp") {
      toast.error(error?.message ?? "Falha ao iniciar a configuração do 2FA.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function handleConfirm() {
    if (!factorId || code.length < 6) return;
    setPending(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setPending(false);
      toast.error(challengeError?.message ?? "Falha ao gerar o desafio.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setPending(false);
    if (verifyError) {
      toast.error("Código inválido. Tente novamente.");
      return;
    }
    toast.success("2FA ativado com sucesso!");
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    loadFactors();
  }

  async function handleCancelEnroll() {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId });
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
  }

  async function handleDisable() {
    if (!factor) return;
    if (!confirm("Desativar a autenticação de dois fatores? A sua conta fica protegida só pela palavra-passe.")) return;
    setPending(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("2FA desativado.");
    setFactor(null);
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (factor) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" /> 2FA ativo
        </div>
        <Button size="sm" variant="outline" onClick={handleDisable} disabled={pending} className="w-full gap-1.5">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
          Desativar
        </Button>
      </div>
    );
  }

  if (enrolling) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Digitalize o código com uma app de autenticação (Google Authenticator, Authy, etc.) ou introduza a chave
          manualmente, depois confirme com o código de 6 dígitos gerado.
        </p>
        {qrCode && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrCode} alt="Código QR do 2FA" className="h-40 w-40 rounded-lg border border-border bg-white p-2" />
        )}
        {secret && <p className="break-all rounded-lg bg-muted p-2 font-mono text-xs">{secret}</p>}
        <Input
          placeholder="Código de 6 dígitos"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          inputMode="numeric"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleConfirm} disabled={pending || code.length < 6} className="gap-1.5">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Confirmar
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEnroll} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={handleStartEnroll} disabled={pending} className="w-full gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      Ativar 2FA
    </Button>
  );
}
