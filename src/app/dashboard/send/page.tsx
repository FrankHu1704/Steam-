'use client'

import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import { Send, Users, Upload, Zap, CalendarClock, Info, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { calculateSmsCost } from '@/lib/sms/pricing'
import { cn, formatNumber } from '@/lib/utils'
import type { ContactList } from '@/types/database'

type Mode = 'single' | 'bulk'
type BulkSource = 'paste' | 'csv' | 'list'

interface ParsedRecipient {
  phone: string
  name?: string
}

export default function SendPage() {
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('single')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Enviar SMS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Envie mensagens individuais ou campanhas em massa.</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
        <button
          onClick={() => setMode('single')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition',
            mode === 'single' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Send size={15} /> Individual
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition',
            mode === 'bulk' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Users size={15} /> Em massa
        </button>
      </div>

      {mode === 'single' ? <SingleSendForm toast={toast} /> : <BulkSendForm toast={toast} />}
    </div>
  )
}

function MessageMeta({ message }: { message: string }) {
  const metrics = useMemo(() => calculateSmsCost(message || ''), [message])
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <span>{metrics.length} caracteres</span>
      <span>
        {metrics.segments} segmento{metrics.segments > 1 ? 's' : ''}
      </span>
      <span>{metrics.isUnicode ? 'Unicode' : 'GSM-7'}</span>
      <span className="font-medium text-brand-600 dark:text-brand-400">{metrics.cost} créditos / destinatário</span>
    </div>
  )
}

function SingleSendForm({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [senderId, setSenderId] = useState('SMSMoz')
  const [flash, setFlash] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/account/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          message,
          sender_id: senderId,
          flash,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast({ title: 'SMS enviado', description: scheduledAt ? 'A mensagem foi agendada.' : 'A mensagem foi enviada com sucesso.', variant: 'success' })
      setTo('')
      setMessage('')
      setScheduledAt('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      toast({
        title: 'Falha ao enviar',
        description: msg === 'INSUFFICIENT_CREDITS' ? 'Créditos insuficientes.' : msg === 'INVALID_PHONE' ? 'Número inválido.' : 'Tente novamente.',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS individual</CardTitle>
        <CardDescription>Envie uma mensagem para um único destinatário, com opção de agendamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Número de destino</label>
            <Input required placeholder="+258 84 123 4567" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Mensagem</label>
            <Textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva a sua mensagem..." />
            <MessageMeta message={message} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID</label>
              <Input maxLength={11} value={senderId} onChange={(e) => setSenderId(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Agendar (opcional)</label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={flash} onChange={(e) => setFlash(e.target.checked)} className="rounded border-slate-300" />
            <Zap size={14} /> Flash SMS (aparece directamente no ecrã do destinatário)
          </label>

          <Button type="submit" variant="gradient" className="w-full" loading={loading}>
            <Send size={16} /> {scheduledAt ? 'Agendar SMS' : 'Enviar SMS'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function BulkSendForm({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [source, setSource] = useState<BulkSource>('paste')
  const [pasteText, setPasteText] = useState('')
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [listId, setListId] = useState('')
  const [message, setMessage] = useState('')
  const [senderId, setSenderId] = useState('SMSMoz')
  const [flash, setFlash] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [batchName, setBatchName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    fetch('/api/account/contact-lists')
      .then((r) => r.json())
      .then((res) => setLists(res?.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (source === 'paste') {
      const parsed = pasteText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((phone) => ({ phone }))
      setRecipients(parsed)
    }
  }, [pasteText, source])

  useEffect(() => {
    if (source !== 'list' || !listId) return
    fetch(`/api/account/contacts?list_id=${listId}&page_size=200`)
      .then((r) => r.json())
      .then((res) => setRecipients((res?.data ?? []).map((c: { phone: string; name: string | null }) => ({ phone: c.phone, name: c.name ?? undefined }))))
      .catch(() => {})
  }, [listId, source])

  function handleCsvUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRecipient[] = []
        for (const row of results.data) {
          const phone = row.phone || row.telefone || row.numero || row.número || Object.values(row)[0]
          if (!phone) continue
          const name = row.name || row.nome
          rows.push({ phone: String(phone).trim(), name: name?.trim() })
        }
        setRecipients(rows)
      },
    })
  }

  const totalCost = useMemo(() => {
    const { cost } = calculateSmsCost(message || '')
    return Math.round(cost * recipients.length * 100) / 100
  }, [message, recipients.length])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (recipients.length === 0) {
      toast({ title: 'Sem destinatários', description: 'Adicione pelo menos um número.', variant: 'error' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/account/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          message,
          sender_id: senderId,
          flash,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          batch_name: batchName || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast({
        title: 'Campanha processada',
        description: `${json.accepted} enviados, ${json.rejected} rejeitados.`,
        variant: 'success',
      })
      setPasteText('')
      setRecipients([])
      setMessage('')
    } catch {
      toast({ title: 'Falha no envio em massa', description: 'Verifique os créditos disponíveis e tente novamente.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS em massa</CardTitle>
        <CardDescription>
          Envie para múltiplos destinatários. Use <code>{'{nome}'}</code> na mensagem para personalizar por contacto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2 text-sm">
            {(
              [
                { key: 'paste', label: 'Colar números' },
                { key: 'csv', label: 'Importar CSV' },
                { key: 'list', label: 'Lista de contactos' },
              ] as { key: BulkSource; label: string }[]
            ).map((opt) => (
              <button
                type="button"
                key={opt.key}
                onClick={() => setSource(opt.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 font-medium transition',
                  source === opt.key
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {source === 'paste' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Números (um por linha ou separados por vírgula)</label>
              <Textarea rows={5} placeholder={'+258841234567\n+258861234567'} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
            </div>
          )}

          {source === 'csv' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Ficheiro CSV (colunas: phone, name)</label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 hover:border-brand-400 dark:border-slate-700 dark:text-slate-400">
                <Upload size={22} />
                {fileName || 'Clique para carregar um ficheiro CSV'}
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
            </div>
          )}

          {source === 'list' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Lista de contactos</label>
              <Select value={listId} onChange={(e) => setListId(e.target.value)}>
                <option value="">Seleccione uma lista</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {recipients.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={15} /> {formatNumber(recipients.length)} destinatário(s) prontos
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Mensagem</label>
            <Textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {nome}, ..." />
            <MessageMeta message={message} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID</label>
              <Input maxLength={11} value={senderId} onChange={(e) => setSenderId(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome da campanha</label>
              <Input placeholder="Opcional" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                <CalendarClock size={14} /> Agendar
              </label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={flash} onChange={(e) => setFlash(e.target.checked)} className="rounded border-slate-300" />
            <Zap size={14} /> Flash SMS
          </label>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Info size={14} /> Custo total estimado
            </span>
            <Badge variant="info">{formatNumber(totalCost)} créditos</Badge>
          </div>

          <Button type="submit" variant="gradient" className="w-full" loading={loading}>
            <Users size={16} /> {scheduledAt ? 'Agendar campanha' : 'Enviar campanha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
