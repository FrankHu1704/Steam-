"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Lock, CheckCircle2, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRUST_POINTS = [
  { icon: Wallet, text: "Você recebe 90% em cada venda" },
  { icon: CheckCircle2, text: "Saques via M-Pesa & e-Mola" },
  { icon: Sparkles, text: "Suporte em Português" },
];

function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="relative mx-auto w-full max-w-sm lg:mx-0"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="p-5">
          <div className="aspect-video w-full rounded-xl bg-brand-gradient" />
          <div className="mt-4 h-3 w-3/4 rounded-full bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-muted" />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
            <span className="text-sm font-semibold">Total a pagar</span>
            <span className="text-lg font-bold text-primary">1.200 MT</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-semibold text-white">
            <Lock className="h-3.5 w-3.5" /> Pagar agora
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -12, y: 0 }}
        animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.7 },
          x: { duration: 0.6, delay: 0.7 },
          y: { duration: 3, delay: 1.3, repeat: Infinity, ease: "easeInOut" },
        }}
        className="glass absolute -left-6 -top-5 flex items-center gap-2 rounded-xl px-3 py-2 shadow-lg"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold">Pagamento confirmado</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 12, y: 0 }}
        animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.9 },
          x: { duration: 0.6, delay: 0.9 },
          y: { duration: 3.4, delay: 1.6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="glass absolute -bottom-5 -right-4 flex items-center gap-2 rounded-xl px-3 py-2 shadow-lg"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <TrendingUp className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold">+2.450 MT hoje</span>
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-20 md:pb-32 md:pt-28">
      <motion.div
        className="pointer-events-none absolute -top-32 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand-gradient blur-[100px]"
        animate={{ opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="container relative grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur lg:mx-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            A plataforma moçambicana de infoprodutos
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-6 max-w-xl text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:mx-0"
          >
            Venda os seus <span className="text-gradient">infoprodutos</span> em minutos.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0"
          >
            A plataforma moçambicana para vender eBooks, cursos online, mentorias, ficheiros
            digitais e muito mais.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Button size="lg" asChild>
              <Link href="/signup">
                Criar Conta Grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/marketplace">Ver Marketplace</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start"
          >
            {TRUST_POINTS.map((t) => (
              <span key={t.text} className="flex items-center gap-1.5">
                <t.icon className="h-4 w-4 text-primary" />
                {t.text}
              </span>
            ))}
          </motion.div>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}
