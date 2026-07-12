'use client'

import Link from 'next/link'
import { Wallet, Send, TrendingUp, PercentCircle, ArrowRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFetch } from '@/hooks/use-fetch'
import { formatNumber, formatDate, truncate } from '@/lib/utils'
import type { UserStats, SmsMessage } from '@/types/database'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  delivered: 'success',
  sent: 'info',
  queued: 'warning',
  scheduled: 'warning',
  failed: 'danger',
  rejected: 'danger',
}

export default function DashboardOverviewPage() {
  const { data: statsRes } = useFetch<{ data: UserStats }>('/api/account/stats')
  const { data: seriesRes } = useFetch<{ data: { date: string; sent: number; delivered: number }[] }>('/api/account/stats/timeseries')
  const { data: messagesRes } = useFetch<{ data: SmsMessage[] }>('/api/account/messages?page_size=6')

  const stats = statsRes?.data
  const series = seriesRes?.data ?? []
  const messages = messagesRes?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão geral</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe o desempenho dos seus envios de SMS.</p>
        </div>
        <Link href="/dashboard/send">
          <Button variant="gradient">
            <Send size={16} /> Enviar SMS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Créditos disponíveis" value={formatNumber(stats?.credits ?? 0)} icon={Wallet} accent="brand" />
        <StatCard label="SMS enviados hoje" value={formatNumber(stats?.sent_today ?? 0)} icon={Send} accent="violet" />
        <StatCard label="SMS enviados este mês" value={formatNumber(stats?.sent_month ?? 0)} icon={TrendingUp} accent="amber" />
        <StatCard label="Taxa de entrega" value={`${stats?.delivery_rate ?? 0}%`} icon={PercentCircle} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Envios nos últimos 14 dias</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b66f5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b66f5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => formatDate(v as string, { dateStyle: 'medium', timeStyle: undefined })} />
                <Area type="monotone" dataKey="sent" stroke="#3b66f5" fill="url(#colorSent)" strokeWidth={2} name="Enviados" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Entregues</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(stats?.delivered_total ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Falhados</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(stats?.failed_total ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total gasto (créditos)</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(stats?.total_spent ?? 0)}</span>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" className="w-full">
                Comprar mais créditos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Mensagens recentes</CardTitle>
          <Link href="/dashboard/history" className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400">
            Ver todas <ArrowRight size={14} />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2 font-medium">Destinatário</th>
                  <th className="pb-2 font-medium">Mensagem</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Ainda não enviou nenhum SMS.
                    </td>
                  </tr>
                )}
                {messages.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">{m.recipient}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">{truncate(m.message, 40)}</td>
                    <td className="py-2.5">
                      <Badge variant={statusVariant[m.status] ?? 'default'}>{m.status}</Badge>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
