"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  Rocket,
  ShieldCheck,
  Wallet,
  BarChart3,
  Users2,
  Smartphone,
  Star,
  ChevronDown,
  Code2,
  Megaphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

const ICON_STYLES = [
  "bg-brand-gradient text-white",
  "bg-primary/10 text-primary",
  "bg-secondary/10 text-secondary",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const FEATURES = [
  { icon: Rocket, title: "Publicação Instantânea", text: "Crie o seu produto e comece a vender em minutos, sem burocracia." },
  { icon: Wallet, title: "Saques Rápidos", text: "Peça o seu saque a qualquer momento via M-Pesa, e-Mola ou levantamento automático (B2C)." },
  { icon: BarChart3, title: "Dashboard Completo", text: "Acompanhe vendas, clientes e afiliados em tempo real." },
  { icon: Users2, title: "Programa de Afiliados", text: "Deixe outras pessoas venderem por si e pague comissão só quando vender." },
  { icon: ShieldCheck, title: "Pagamentos Seguros", text: "Checkout protegido, entrega automática após confirmação do pagamento." },
  { icon: Code2, title: "API para Programadores", text: "Integre a PagaJá no seu próprio sistema com checkout personalizado — comece em modo teste, avance para produção." },
  { icon: Star, title: "Avaliações Verificadas", text: "Os seus clientes deixam avaliações reais que aumentam a confiança na compra." },
  { icon: Megaphone, title: "Campanhas & Pixels", text: "Rastreie as suas campanhas com UTMs e adicione pixels do Meta, Google ou TikTok ao seu produto." },
  { icon: Smartphone, title: "100% Responsivo", text: "Gerencie o seu negócio do telemóvel, instale como aplicativo (PWA)." },
];

const STEPS = [
  { n: "01", title: "Crie a sua conta", text: "Cadastro gratuito, sem cartão de crédito necessário." },
  { n: "02", title: "Publique o seu produto", text: "Adicione título, preço, capa e os ficheiros do seu infoproduto." },
  { n: "03", title: "Partilhe o link", text: "Envie o link de venda nas redes sociais ou WhatsApp." },
  { n: "04", title: "Receba o pagamento", text: "Entrega automática ao cliente e saldo disponível para saque." },
];

const BENEFITS = [
  "Sem mensalidade — só paga quando vender",
  "Suporte dedicado em português",
  "Entrega automática de ficheiros",
  "Notificações push em tempo real",
  "Cupões de desconto e order bumps",
  "Marketplace para ganhar visibilidade extra",
];

const STATS = [
  { value: "5%", label: "Taxa por venda" },
  { value: "24h", label: "Saques processados" },
  { value: "100%", label: "Em Português" },
];

const METHODS: { label: string; logo?: string }[] = [
  { label: "M-Pesa", logo: "/payment-logos/mpesa.png" },
  { label: "e-Mola", logo: "/payment-logos/emola.png" },
  { label: "mKesh" },
  { label: "Visa & Mastercard", logo: "/payment-logos/visa-mastercard.png" },
  { label: "PayFast" },
];

const TESTIMONIALS = [
  { name: "Aisha M.", role: "Criadora de Cursos", text: "Em uma semana já tinha vendido mais eBooks do que em 3 meses fazendo tudo manualmente." },
  { name: "Nelson C.", role: "Mentor de Negócios", text: "O programa de afiliados foi o que fez as minhas mentorias escalarem de verdade." },
  { name: "Vânia S.", role: "Designer de Templates", text: "Checkout rápido e entrega automática — os meus clientes recebem na hora." },
];

const FAQS = [
  { q: "É realmente gratuito começar?", a: "Sim. Não há mensalidade — a PagaJá só fica com uma pequena percentagem quando você vende." },
  { q: "Como recebo o dinheiro das vendas?", a: "O valor fica disponível no seu saldo e pode ser sacado via M-Pesa, e-Mola ou transferência bancária." },
  { q: "Posso vender cursos com vídeo?", a: "Sim, pode adicionar vídeos, PDFs, templates e outros ficheiros digitais ao seu produto." },
  { q: "Existe programa de afiliados?", a: "Sim — ative a afiliação no seu produto e qualquer pessoa pode promovê-lo por comissão." },
  { q: "Posso integrar a PagaJá no meu próprio sistema?", a: "Sim — disponibilizamos uma API para programadores com checkout personalizado, chaves de teste e produção." },
];

export function Features() {
  return (
    <section id="recursos" className="container py-24">
      <Reveal>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Tudo o que precisa para vender</h2>
          <p className="mt-3 text-muted-foreground">Recursos pensados para quem vive de infoprodutos.</p>
        </div>
      </Reveal>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <Card className="glass h-full p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${ICON_STYLES[i % ICON_STYLES.length]}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-muted/40 py-24">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Como Funciona</h2>
            <p className="mt-3 text-muted-foreground">Do cadastro à primeira venda em 4 passos.</p>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-base font-bold text-white shadow-lg shadow-primary/20">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Benefits() {
  return (
    <section id="beneficios" className="container py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <h2 className="text-3xl font-bold md:text-4xl">
            Feito para quem quer <span className="text-gradient">crescer</span>, não só vender.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A PagaJá cuida da parte técnica — pagamentos, entrega, afiliados — para você focar em
            criar o próximo infoproduto.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-gradient text-2xl font-bold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
                <span className="text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export function PaymentMethods() {
  return (
    <section id="metodos" className="bg-muted/40 py-24">
      <div className="container text-center">
        <Reveal>
          <h2 className="text-3xl font-bold md:text-4xl">Métodos de Pagamento</h2>
          <p className="mt-3 text-muted-foreground">
            Os seus clientes pagam do jeito que já conhecem.
          </p>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {METHODS.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.05}>
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                {m.logo ? (
                  <Image src={m.logo} alt={m.label} width={88} height={36} className="h-8 w-auto object-contain" />
                ) : (
                  <span className="text-sm font-semibold">{m.label}</span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="container py-24">
      <Reveal>
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Quem já vende com a PagaJá</h2>
        </div>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}>
            <Card className="h-full p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                  {initials(t.name)}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-muted/40 py-24">
      <div className="container max-w-2xl">
        <Reveal>
          <h2 className="text-center text-3xl font-bold md:text-4xl">Perguntas Frequentes</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold"
              >
                {f.q}
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
