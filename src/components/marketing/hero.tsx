'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, ShieldCheck, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-slate [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 animate-blob rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-10 right-0 -z-10 h-[400px] w-[400px] animate-blob rounded-full bg-fuchsia-500/10 blur-3xl [animation-delay:2s]" />

      <div className="container flex flex-col items-center py-24 text-center sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          Plataforma 100% moçambicana de SMS em massa
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl"
        >
          Envie SMS em massa para <span className="text-gradient">todo Moçambique</span> em segundos
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400"
        >
          API REST moderna, painel intuitivo e entrega fiável para Vodacom, Movitel e Tmcel. SMS transacionais,
          campanhas em massa e notificações — tudo numa só plataforma.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Link href="/register">
            <Button variant="gradient" size="lg" className="w-full sm:w-auto">
              Começar gratuitamente <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Ver documentação da API
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Zap, label: 'Entrega instantânea', desc: 'Latência média inferior a 3 segundos' },
            { icon: ShieldCheck, label: 'Infraestrutura segura', desc: 'JWT, hashing bcrypt e 2FA opcional' },
            { icon: Gauge, label: '99.9% de disponibilidade', desc: 'Monitorização e failover automático' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 rounded-xl glass-panel px-4 py-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient-soft text-brand-600 dark:text-brand-400">
                <f.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
