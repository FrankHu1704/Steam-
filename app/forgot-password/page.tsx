"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await requestPasswordReset(formData);
    if (res?.error) setError(res.error);
    else setSent(true);
    setPending(false);
  }

  return (
    <AuthCard
      title="Recuperar Senha"
      subtitle="Enviamos um link de recuperação para o seu email"
      footer={
        <Link href="/login" className="font-semibold text-primary">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-emerald-600">
          Se existir uma conta com esse email, enviámos um link de recuperação.
        </p>
      ) : (
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "A enviar…" : "Enviar Link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
