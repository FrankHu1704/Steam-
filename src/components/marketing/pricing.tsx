'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Plan } from '@/types/database'

const FALLBACK_PLANS: Partial<Plan>[] = [
  { id: 'starter', name: 'Starter', price: 500, currency: 'MZN', credits: 300, is_popular: false, features: ['300 créditos SMS', 'Suporte por email', 'API REST incluída', 'Relatórios básicos'] },
  { id: 'business', name: 'Business', price: 2000, currency: 'MZN', credits: 1500, is_popular: true, features: ['1500 créditos SMS', 'Suporte prioritário', 'SMS agendado', 'Listas ilimitadas', 'Relatórios avançados'] },
  { id: 'enterprise', name: 'Enterprise', price: 8000, currency: 'MZN', credits: 7000, is_popular: false, features: ['7000 créditos SMS', 'Gestor de conta dedicado', 'SLA garantido', 'Sender ID personalizado', 'Webhooks'] },
]

export function Pricing() {
  const [plans, setPlans] = useState<Partial<Plan>[]>(FALLBACK_PLANS)

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((res) => res?.data?.length && setPlans(res.data))
      .catch(() => {})
  }, [])

  return (
    <section id="pricing" className="bg-slate-50 py-24 dark:bg-slate-900/40">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Planos simples e transparentes</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Pague apenas pelo que enviar. Sem mensalidades escondidas.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.is_popular
                  ? 'border-brand-500 bg-white shadow-xl shadow-brand-500/10 dark:bg-slate-900'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
              }`}
            >
              {plan.is_popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price ?? 0, plan.currency)}</span>
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.credits} créditos SMS incluídos</p>

              <ul className="mt-6 flex-1 space-y-3">
                {(plan.features ?? []).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="mt-8">
                <Button variant={plan.is_popular ? 'gradient' : 'outline'} className="w-full">
                  Escolher {plan.name}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
