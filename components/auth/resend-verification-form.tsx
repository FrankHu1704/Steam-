"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationEmail } from "@/lib/actions/auth";

export function ResendVerificationForm({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult(null);
    const res = await resendVerificationEmail(email);
    setPending(false);
    setResult(res);
  }

  return (
    <form onSubmit={handleResend} className="mt-6 space-y-3 text-left">
      <div>
        <Label htmlFor="resend-email">Não recebeu? Confirme o email e reenviamos</Label>
        <Input
          id="resend-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Reenviar email de confirmação
      </Button>
      {result?.ok && <p className="text-sm text-emerald-600">Email reenviado — verifique a caixa de entrada e o spam.</p>}
      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
    </form>
  );
}
