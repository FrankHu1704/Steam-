'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Plus, Copy, Trash2, KeyRound, ExternalLink, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import type { ApiKey } from '@/types/database'

export default function ApiKeysPage() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadKeys() {
    const res = await fetch('/api/account/api-keys')
    const json = await res.json()
    setKeys(json?.data ?? [])
  }

  useEffect(() => {
    loadKeys()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/account/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'Chave sem nome' }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao criar chave', variant: 'error' })
      return
    }
    setNewKey(json.data.key)
    setName('')
    loadKeys()
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/account/api-keys/${id}`, { method: 'DELETE' })
    toast({ title: 'Chave revogada', variant: 'success' })
    loadKeys()
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chaves API</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gere chaves para integrar o envio de SMS na sua aplicação.</p>
        </div>
        <Link href="/docs" target="_blank">
          <Button variant="outline">
            <ExternalLink size={16} /> Ver documentação
          </Button>
        </Link>
      </div>

      {newKey && (
        <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Guarde esta chave agora — não voltará a ser exibida por motivos de segurança.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-900">{newKey}</code>
              <Button variant="outline" size="sm" onClick={copyKey}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova chave</CardTitle>
          <CardDescription>Dê um nome descritivo (ex: &ldquo;Servidor de produção&rdquo;).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input placeholder="Nome da chave" value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="gradient" loading={loading}>
              <Plus size={16} /> Gerar chave
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chaves activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {keys.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma chave criada ainda.</p>}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <KeyRound size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{k.name}</p>
                    <p className="font-mono text-xs text-slate-400">
                      {k.key_prefix}_••••••••••• · criada em {formatDate(k.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={k.is_active ? 'success' : 'danger'}>{k.is_active ? 'Activa' : 'Revogada'}</Badge>
                  {k.is_active && (
                    <button onClick={() => handleRevoke(k.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
