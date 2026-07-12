'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatDate, truncate } from '@/lib/utils'
import type { SmsMessage } from '@/types/database'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  delivered: 'success',
  sent: 'info',
  queued: 'warning',
  scheduled: 'warning',
  failed: 'danger',
  rejected: 'danger',
}

const PAGE_SIZE = 20

export default function HistoryPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
    if (status) params.set('status', status)
    fetch(`/api/account/messages?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        setMessages(res?.data ?? [])
        setTotal(res?.pagination?.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [status, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico de SMS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Consulte e exporte todas as mensagens enviadas.</p>
        </div>
        <a href="/api/account/reports/export">
          <Button variant="outline">
            <Download size={16} /> Exportar CSV
          </Button>
        </a>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <Select
              className="w-48"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos os estados</option>
              <option value="delivered">Entregue</option>
              <option value="sent">Enviado</option>
              <option value="queued">Em fila</option>
              <option value="scheduled">Agendado</option>
              <option value="failed">Falhado</option>
              <option value="rejected">Rejeitado</option>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2 font-medium">Destinatário</th>
                  <th className="pb-2 font-medium">Mensagem</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Segmentos</th>
                  <th className="pb-2 font-medium">Custo</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {!loading && messages.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Nenhuma mensagem encontrada.
                    </td>
                  </tr>
                )}
                {messages.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">{m.recipient}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">{truncate(m.message, 40)}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{m.message_type}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{m.segments}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{m.cost}</td>
                    <td className="py-2.5">
                      <Badge variant={statusVariant[m.status] ?? 'default'}>{m.status}</Badge>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              Página {page} de {totalPages} · {total} mensagens
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Seguinte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
