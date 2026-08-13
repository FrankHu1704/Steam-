"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Zap, User, Mail, Lock, Phone, Cake, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/actions/auth";
import { trackEmployeeClick } from "@/lib/actions/employee-tracking";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await signIn(formData);
    if (res?.error) setError(res.error);
    setPending(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <Input
            id="login-email"
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
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Palavra-passe</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary">
            Esqueceu-se?
          </Link>
        </div>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
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
        {pending ? "A entrar…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const pref = searchParams.get("pref") ?? "";

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
    <form action={handleSubmit} className="space-y-4">
      {ref && <input type="hidden" name="ref" value={ref} />}
      {pref && <input type="hidden" name="pref" value={pref} />}
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Nome</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <User className="h-4 w-4" />
          </span>
          <Input
            id="signup-name"
            name="name"
            required
            autoComplete="name"
            placeholder="O seu nome"
            className="border-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-phone">Telemóvel</Label>
        <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center gap-1.5 bg-muted pl-3 pr-2 text-sm font-medium text-muted-foreground">
            <Phone className="h-4 w-4" /> +258
          </span>
          <Input
            id="signup-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="841234567"
            className="rounded-none border-0 focus-visible:ring-0"
          />
        </div>
        <p className="text-xs text-muted-foreground">Para receber notificações de vendas por SMS e WhatsApp. Só pode ser usado numa conta.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-birthDate">Data de nascimento</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Cake className="h-4 w-4" />
          </span>
          <Input
            id="signup-birthDate"
            name="birthDate"
            type="date"
            required
            autoComplete="bday"
            className="border-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <Input
            id="signup-email"
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
        <Label htmlFor="signup-password">Palavra-passe</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="signup-password"
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
        da PayNow.
      </p>
    </form>
  );
}

export function AuthToggleCard({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-secondary opacity-10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          Pay<span className="text-gradient">Now</span>
        </Link>

        <div className="glass rounded-2xl p-8 shadow-xl">
          {/* Sliding pill toggle — animates between Entrar / Criar conta */}
          <div className="relative grid grid-cols-2 rounded-full bg-muted p-1">
            <span
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-brand-gradient shadow-md transition-transform duration-300 ease-out"
              style={{ transform: tab === "signup" ? "translateX(calc(100% + 4px))" : "translateX(0)" }}
            />
            <button
              type="button"
              onClick={() => setTab("login")}
              className={cn(
                "relative z-10 rounded-full py-2 text-sm font-semibold transition-colors duration-300",
                tab === "login" ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={cn(
                "relative z-10 rounded-full py-2 text-sm font-semibold transition-colors duration-300",
                tab === "signup" ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Criar conta
            </button>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-bold">{tab === "login" ? "Bem-vindo de volta" : "Criar Conta"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "login" ? "Entre para gerir os seus produtos e vendas" : "Comece a vender os seus infoprodutos gratuitamente"}
            </p>
          </div>

          {/* Crossfade + slide between the two forms — both share the grid
              cell so the card height settles on the taller (signup) form
              instead of jumping. */}
          <div className="mt-6 grid">
            <div
              className={cn(
                "col-start-1 row-start-1 transition-all duration-300 ease-out",
                tab === "login" ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-3 opacity-0",
              )}
            >
              <LoginForm />
            </div>
            <div
              className={cn(
                "col-start-1 row-start-1 transition-all duration-300 ease-out",
                tab === "signup" ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-3 opacity-0",
              )}
            >
              <SignupForm />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Pagamentos seguros
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Saques instantâneos
          </span>
        </div>
      </div>
    </main>
  );
}
