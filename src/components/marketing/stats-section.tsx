'use client'

import { useEffect, useState } from 'react'
import { AnimatedCounter } from './animated-counter'

interface PublicStats {
  clients: number
  sms_sent_month: number
  delivery_rate: number
  uptime: number
}

export function StatsSection() {
  const [stats, setStats] = useState<PublicStats>({ clients: 1200, sms_sent_month: 480000, delivery_rate: 98.6, uptime: 99.9 })

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((res) => res?.data && setStats(res.data))
      .catch(() => {})
  }, [])

  const items = [
    { label: 'Empresas activas', value: stats.clients, suffix: '+' },
    { label: 'SMS enviados este mês', value: stats.sms_sent_month, suffix: '+' },
    { label: 'Taxa de entrega', value: stats.delivery_rate, suffix: '%', decimals: 1 },
    { label: 'Disponibilidade', value: stats.uptime, suffix: '%', decimals: 1 },
  ]

  return (
    <section className="border-y border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="container grid grid-cols-2 gap-8 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-3xl font-bold text-gradient sm:text-4xl">
              <AnimatedCounter value={item.value} suffix={item.suffix} decimals={item.decimals ?? 0} />
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
