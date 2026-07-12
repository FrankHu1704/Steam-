'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import type { Promotion } from '@/types/database'

export default function AdminPromotionsPage() {
  const { toast } = useToast()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [form, setForm] = useState({ code: '', description: '', discount_percent: '', bonus_credits: '', max_uses: '' })
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/promotions')
    const json = await res.json()
    setPromotions(json?.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        description: form.description || undefined,
        discount_percent: Number(form.discount_percent || 0),
        bonus_credits: Number(form.bonus_credits || 0),
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao criar promoção (código pode já existir)', variant: 'error' })
      return
    }
    toast({ title: 'Promoção criada', variant: 'success' })
    setForm({ code: '', description: '', discount_percent: '', bonus_credits: '', max_uses: '' })
    load()
  }

  async function toggleActive(promo: Promotion) {
    await fetch(`/api/admin/promotions/${promo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !promo.is_active }),
    })
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Promoções</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Crie códigos promocionais com desconto ou créditos bónus.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova promoção</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input required placeholder="Código (ex: BEMVINDO10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="number" placeholder="Desconto (%)" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            <Input type="number" placeholder="Créditos bónus" value={form.bonus_credits} onChange={(e) => setForm({ ...form, bonus_credits: e.target.value })} />
            <Input type="number" placeholder="Limite de utilizações (opcional)" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            <Button type="submit" variant="gradient" loading={loading}>
              <Plus size={16} /> Criar promoção
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2 font-medium">Código</th>
                  <th className="pb-2 font-medium">Desconto</th>
                  <th className="pb-2 font-medium">Créditos bónus</th>
                  <th className="pb-2 font-medium">Utilizações</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Criado</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 font-mono text-xs font-semibold text-slate-900 dark:text-white">{p.code}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">{p.discount_percent}%</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">{p.bonus_credits}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">
                      {p.used_count}
                      {p.max_uses ? ` / ${p.max_uses}` : ''}
                    </td>
                    <td className="py-2.5">
                      <button onClick={() => toggleActive(p)}>
                        <Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Activa' : 'Inactiva'}</Badge>
                      </button>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(p.created_at)}</td>
                    <td className="py-2.5">
                      <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </td>
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
