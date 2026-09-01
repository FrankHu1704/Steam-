"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Zap, User, Mail, Lock, Phone, Cake, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn, signUp, signInWithGoogle } from "@/lib/actions/auth";
import { trackEmployeeClick } from "@/lib/actions/employee-tracking";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";

function GoogleAuthButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle.bind(null, next)}>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium hover:bg-muted"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar com Google
      </button>
    </form>
  );
}

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
    <div className="space-y-4">
      <GoogleAuthButton next={next} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou entre com email
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1.5">
        <Label htmlFor="login-email">Email ou telemóvel</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <Input
            id="login-email"
            name="email"
            type="text"
            required
            autoComplete="username"
            placeholder="seu@email.com ou 84xxxxxxx"
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
    </div>
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
    <div className="space-y-4">
      <GoogleAuthButton />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou registe-se com email
        <span className="h-px flex-1 bg-border" />
      </div>
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
        <p className="text-xs text-muted-foreground">Para receber notificações de vendas por SMS e WhatsApp.</p>
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
    </div>
  );
}

export function AuthToggleCard({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <main className="relative flex min-h-screen items-stretch overflow-x-hidden bg-background lg:grid lg:grid-cols-2">
      {/* Branding panel — desktop only. On mobile the gradient blobs behind
          the form card already carry the same visual weight, so this whole
          panel would just be redundant empty space below the fold. */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <Link href="/" className="relative text-2xl font-bold">
          PayNow
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Venda os seus infoprodutos em minutos, receba em M-Pesa, e-Mola ou cartão.
          </h2>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="text-sm text-white/90">Pagamentos seguros, verificados a cada transação</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Zap className="h-4 w-4" />
              </span>
              <p className="text-sm text-white/90">Saques instantâneos direto para a sua carteira</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} PayNow. Todos os direitos reservados.</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center overflow-x-hidden px-6 py-16">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl lg:hidden" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-secondary opacity-10 blur-3xl lg:hidden" />
        <div className="relative w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold lg:hidden">
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
      </div>
    </main>
  );
}
