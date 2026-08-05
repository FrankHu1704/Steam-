"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f) => f.status === "verified");
    if (!factor) {
      setError("Nenhum método de 2FA encontrado nesta conta.");
      setPending(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Falha ao gerar o desafio.");
      setPending(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });
    setPending(false);
    if (verifyError) {
      setError("Código inválido. Tente novamente.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Código de autenticação</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          inputMode="numeric"
          autoFocus
          placeholder="000000"
          className="text-center font-mono text-lg tracking-widest"
        />
        <p className="text-xs text-muted-foreground">Abra a sua app de autenticação e introduza o código atual.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending || code.length < 6} className="w-full gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {pending ? "A verificar…" : "Verificar"}
      </Button>
    </form>
  );
}

export default function Verify2FAPage() {
  return (
    <AuthCard title="Verificação em duas etapas" subtitle="Introduza o código gerado pela sua app de autenticação">
      <Suspense fallback={null}>
        <Verify2FAForm />
      </Suspense>
    </AuthCard>
  );
}
