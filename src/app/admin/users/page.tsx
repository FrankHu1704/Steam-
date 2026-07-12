'use client'

import { useEffect, useState } from 'react'
import { Search, CheckCircle2, Ban, Wallet, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Profile } from '@/types/database'

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  pending: 'warning',
  blocked: 'danger',
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [adjustingUser, setAdjustingUser] = useState<Profile | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const res = await fetch(`/api/admin/users?${params.toString()}`)
    const json = await res.json()
    setUsers(json?.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status])

  async function updateUser(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      toast({ title: 'Erro ao actualizar utilizador', variant: 'error' })
      return
    }
    toast({ title: 'Utilizador actualizado', variant: 'success' })
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Utilizadores</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Aprove, bloqueie e gira o saldo dos clientes.</p>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Pesquisar por nome ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os estados</option>
              <option value="active">Activo</option>
              <option value="pending">Pendente</option>
              <option value="blocked">Bloqueado</option>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Empresa</th>
                  <th className="pb-2 font-medium">Créditos</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Registado</th>
                  <th className="pb-2 font-medium">Acções</th>
                </tr>
              </thead>
              <tbody>
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      {u.full_name}
                      {u.role === 'admin' && (
                        <Badge variant="info" className="ml-2">
                          Admin
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{u.company_name || '—'}</td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{formatNumber(u.credits)}</td>
                    <td className="py-2.5">
                      <Badge variant={statusVariant[u.status]}>{u.status}</Badge>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(u.created_at)}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {u.status !== 'active' && (
                          <button title="Aprovar" onClick={() => updateUser(u.id, { status: 'active' })} className="text-slate-400 hover:text-emerald-500">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {u.status !== 'blocked' && (
                          <button title="Bloquear" onClick={() => updateUser(u.id, { status: 'blocked' })} className="text-slate-400 hover:text-red-500">
                            <Ban size={16} />
                          </button>
                        )}
                        <button title="Ajustar saldo" onClick={() => setAdjustingUser(u)} className="text-slate-400 hover:text-brand-500">
                          <Wallet size={16} />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            title="Promover a administrador"
                            onClick={() => updateUser(u.id, { role: 'admin' })}
                            className="text-slate-400 hover:text-violet-500"
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {adjustingUser && (
        <AdjustCreditsModal
          user={adjustingUser}
          onClose={() => setAdjustingUser(null)}
          onSubmit={async (amount, reason) => {
            await updateUser(adjustingUser.id, { credit_adjustment: amount, adjustment_reason: reason })
            setAdjustingUser(null)
          }}
        />
      )}
    </div>
  )
}

function AdjustCreditsModal({
  user,
  onClose,
  onSubmit,
}: {
  user: Profile
  onClose: () => void
  onSubmit: (amount: number, reason: string) => void
}) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ajustar saldo — {user.full_name}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saldo actual: {formatNumber(user.credits)} créditos</p>

        <div className="mt-4 space-y-3">
          <Input type="number" placeholder="Valor (use negativo para deduzir)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="gradient" className="flex-1" onClick={() => amount && onSubmit(Number(amount), reason)}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}
