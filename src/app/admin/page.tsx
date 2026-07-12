'use client'

import { Users, MessageSquareText, Wallet, PercentCircle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFetch } from '@/hooks/use-fetch'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { AdminStats } from '@/types/database'

export default function AdminOverviewPage() {
  const { data } = useFetch<{ data: AdminStats }>('/api/admin/stats')
  const stats = data?.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel administrativo</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Visão global da plataforma SMSMoz.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilizadores activos" value={formatNumber(stats?.active_users ?? 0)} icon={Users} accent="brand" />
        <StatCard label="Contas pendentes" value={formatNumber(stats?.pending_users ?? 0)} icon={Users} accent="amber" />
        <StatCard label="SMS enviados hoje" value={formatNumber(stats?.sms_today ?? 0)} icon={MessageSquareText} accent="violet" />
        <StatCard label="Taxa de entrega" value={`${stats?.delivery_rate ?? 0}%`} icon={PercentCircle} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Receita este mês" value={formatCurrency(stats?.revenue_month ?? 0)} icon={Wallet} accent="brand" />
        <StatCard label="SMS enviados este mês" value={formatNumber(stats?.sms_month ?? 0)} icon={MessageSquareText} accent="violet" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total de utilizadores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatNumber(stats?.total_users ?? 0)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatNumber(stats?.active_users ?? 0)} activos · {formatNumber(stats?.pending_users ?? 0)} pendentes
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
