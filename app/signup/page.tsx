"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, Mail, Lock, Phone, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/actions/auth";
import { trackEmployeeClick } from "@/lib/actions/employee-tracking";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";

  useEffect(() => {
    if (ref) void trackEmployeeClick(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

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
        {ref && <input type="hidden" name="ref" value={ref} />}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="flex items-center pl-3 text-muted-foreground">
              <User className="h-4 w-4" />
            </span>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              placeholder="O seu nome"
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telemóvel</Label>
          <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="flex items-center gap-1.5 bg-muted pl-3 pr-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" /> +258
            </span>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="841234567"
              className="rounded-none border-0 focus-visible:ring-0"
            />
          </div>
          <p className="text-xs text-muted-foreground">Para receber notificações de vendas por SMS e WhatsApp.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="flex items-center pl-3 text-muted-foreground">
              <Mail className="h-4 w-4" />
            </span>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="flex items-center pl-3 text-muted-foreground">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              className="border-0 focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="flex items-center px-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {pending ? "A criar…" : "Começar Gratuitamente"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ao criar conta, concorda com os{" "}
          <Link href="/termos" className="underline hover:text-foreground">
            Termos de Serviço
          </Link>{" "}
          e{" "}
          <Link href="/privacidade" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>{" "}
          da PagaJá.
        </p>
      </form>
    </AuthCard>
  );
}
