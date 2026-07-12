'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Plan } from '@/types/database'

export default function AdminPlansPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState({ name: '', price: '', credits: '', price_per_sms: '1.5', features: '', is_popular: false })
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/plans')
    const json = await res.json()
    setPlans(json?.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        price: Number(form.price),
        credits: Number(form.credits),
        price_per_sms: Number(form.price_per_sms),
        features: form.features.split('\n').filter(Boolean),
        is_popular: form.is_popular,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao criar plano', variant: 'error' })
      return
    }
    toast({ title: 'Plano criado', variant: 'success' })
    setForm({ name: '', price: '', credits: '', price_per_sms: '1.5', features: '', is_popular: false })
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' })
    toast({ title: 'Plano removido', variant: 'success' })
    load()
  }

  async function togglePopular(plan: Plan) {
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_popular: !plan.is_popular }),
    })
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Planos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Defina os pacotes de créditos disponíveis para compra.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo plano</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input required placeholder="Nome do plano" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required type="number" placeholder="Preço (MZN)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input required type="number" placeholder="Créditos incluídos" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            <Input
              required
              type="number"
              step="0.01"
              placeholder="Preço por SMS"
              value={form.price_per_sms}
              onChange={(e) => setForm({ ...form, price_per_sms: e.target.value })}
            />
            <Textarea
              className="sm:col-span-2"
              placeholder="Funcionalidades (uma por linha)"
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
            />
            <Button type="submit" variant="gradient" className="sm:col-span-2" loading={loading}>
              <Plus size={16} /> Criar plano
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                <div className="flex items-center gap-2">
                  {plan.is_popular && <Badge variant="info">Popular</Badge>}
                  <Badge variant={plan.is_active ? 'success' : 'default'}>{plan.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price, plan.currency)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{plan.credits} créditos</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => togglePopular(plan)}>
                  <Star size={14} /> {plan.is_popular ? 'Remover destaque' : 'Destacar'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
