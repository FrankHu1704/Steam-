'use client'

import { useEffect, useState } from 'react'
import { Wallet, Check, Smartphone, CreditCard, Landmark } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { Plan, Transaction } from '@/types/database'

const methods = [
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { id: 'emola', label: 'e-Mola', icon: Smartphone },
  { id: 'card', label: 'Cartão bancário', icon: CreditCard },
  { id: 'stripe', label: 'Stripe', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: Landmark },
] as const

export default function BillingPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [credits, setCredits] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [method, setMethod] = useState<(typeof methods)[number]['id']>('mpesa')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((res) => setPlans(res?.data ?? []))
    fetch('/api/account/transactions')
      .then((r) => r.json())
      .then((res) => setTransactions(res?.data ?? []))
    fetch('/api/account/stats')
      .then((r) => r.json())
      .then((res) => setCredits(res?.data?.credits ?? 0))
  }, [])

  async function handlePurchase() {
    if (!selectedPlan) return
    setLoading(true)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan.id, amount: selectedPlan.price, payment_method: method, phone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (json.data.redirectUrl) {
        window.location.href = json.data.redirectUrl
        return
      }

      toast({ title: 'Pagamento iniciado', description: json.data.instructions ?? 'Siga as instruções para concluir o pagamento.', variant: 'info' })

      // Demo/sandbox confirmation — see /api/payments/confirm for the production caveat.
      setTimeout(async () => {
        await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id: json.data.transactionId }),
        })
        toast({ title: 'Pagamento confirmado', description: `${selectedPlan.credits} créditos adicionados.`, variant: 'success' })
        setCredits((c) => c + selectedPlan.credits)
        setSelectedPlan(null)
        fetch('/api/account/transactions')
          .then((r) => r.json())
          .then((res) => setTransactions(res?.data ?? []))
      }, 2500)
    } catch {
      toast({ title: 'Falha ao iniciar pagamento', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Faturação</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Compre créditos e consulte o seu histórico de pagamentos.</p>
      </div>

      <Card className="bg-brand-gradient text-white">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-white/80">Saldo actual</p>
            <p className="mt-1 text-3xl font-bold">{formatNumber(credits)} créditos</p>
          </div>
          <Wallet size={40} className="text-white/60" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprar créditos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedPlan?.id === plan.id
                    ? 'border-brand-500 ring-2 ring-brand-500/30'
                    : 'border-slate-200 hover:border-brand-300 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                  {plan.is_popular && <Badge variant="info">Popular</Badge>}
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price, plan.currency)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plan.credits} créditos</p>
              </button>
            ))}
          </div>

          {selectedPlan && (
            <div className="mt-6 space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Método de pagamento</p>
              <div className="flex flex-wrap gap-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      method === m.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <m.icon size={15} /> {m.label}
                  </button>
                ))}
              </div>

              {(method === 'mpesa' || method === 'emola') && (
                <Input placeholder="Número de telemóvel (84/85/86/87...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              )}

              <Button variant="gradient" className="w-full" loading={loading} onClick={handlePurchase}>
                <Check size={16} /> Pagar {formatCurrency(selectedPlan.price, selectedPlan.currency)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Método</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Créditos</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Sem transacções ainda.
                    </td>
                  </tr>
                )}
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{t.type}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{t.payment_method ?? '—'}</td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{t.amount ? formatCurrency(t.amount) : '—'}</td>
                    <td className={`py-2.5 font-medium ${t.credits >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.credits >= 0 ? '+' : ''}
                      {formatNumber(t.credits)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={t.payment_status === 'completed' ? 'success' : t.payment_status === 'failed' ? 'danger' : 'warning'}>
                        {t.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(t.created_at)}</td>
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
