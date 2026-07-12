'use client'

import { motion } from 'framer-motion'
import { Send, Users, Code2, CalendarClock, ShieldCheck, BarChart3, Zap, Globe2 } from 'lucide-react'

const features = [
  { icon: Send, title: 'SMS em massa e individual', desc: 'Envie para um número ou milhares de contactos em simultâneo, com personalização por nome.' },
  { icon: Code2, title: 'API REST completa', desc: 'Endpoints documentados com OpenAPI/Swagger para integrar em minutos na sua aplicação.' },
  { icon: Users, title: 'Gestão de contactos', desc: 'Listas, etiquetas e importação por CSV para organizar as suas campanhas.' },
  { icon: CalendarClock, title: 'Envio agendado', desc: 'Programe campanhas para a data e hora ideais, com SMS longo e Unicode suportados.' },
  { icon: BarChart3, title: 'Relatórios em tempo real', desc: 'Acompanhe taxas de entrega, custos e histórico completo, exportável em CSV.' },
  { icon: ShieldCheck, title: 'Segurança de nível empresarial', desc: 'Chaves API, rate limiting, JWT, bcrypt e autenticação de dois factores opcional.' },
  { icon: Zap, title: 'SMS transacional instantâneo', desc: 'OTPs, confirmações e alertas entregues em segundos via API dedicada.' },
  { icon: Globe2, title: 'Cobertura nacional', desc: 'Entrega garantida para Vodacom, Movitel e Tmcel em todo o território moçambicano.' },
]

export function Features() {
  return (
    <section id="features" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Tudo o que precisa para comunicar em escala
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Ferramentas poderosas construídas para empresas moçambicanas — da startup à grande corporação.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-600 transition group-hover:bg-brand-gradient group-hover:text-white dark:text-brand-400">
              <f.icon size={20} />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
