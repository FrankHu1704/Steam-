"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/actions/auth";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await signUp(formData);
    if (res?.error) setError(res.error);
    setPending(false);
  }

  return (
    <AuthCard
      title="Criar Conta"
      subtitle="Comece a vender os seus infoprodutos gratuitamente"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Entrar
          </Link>
        </>
      }
    >
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Palavra-passe</Label>
          <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "A criar…" : "Começar Gratuitamente"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ao criar conta, concorda com os Termos de Serviço e Política de Privacidade da PagaJá.
        </p>
      </form>
    </AuthCard>
  );
}
