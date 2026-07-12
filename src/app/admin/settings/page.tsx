'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface SettingsShape {
  sms_pricing: { base_price_per_sms: number; currency: string; unicode_multiplier: number; long_sms_segment_length: number }
  platform: { name: string; support_email: string; default_sender_id: string }
  rate_limits: { api_requests_per_minute: number; bulk_max_recipients: number }
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SettingsShape | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((res) => setSettings(res?.data ?? null))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setLoading(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao guardar configurações', variant: 'error' })
      return
    }
    toast({ title: 'Configurações actualizadas', variant: 'success' })
  }

  if (!settings) return <p className="text-sm text-slate-400">A carregar...</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações do sistema</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Parâmetros globais da plataforma SMSMoz.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome da plataforma</label>
              <Input value={settings.platform.name} onChange={(e) => setSettings({ ...settings, platform: { ...settings.platform, name: e.target.value } })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email de suporte</label>
              <Input
                value={settings.platform.support_email}
                onChange={(e) => setSettings({ ...settings, platform: { ...settings.platform, support_email: e.target.value } })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID por omissão</label>
              <Input
                maxLength={11}
                value={settings.platform.default_sender_id}
                onChange={(e) => setSettings({ ...settings, platform: { ...settings.platform, default_sender_id: e.target.value } })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preços de SMS</CardTitle>
            <CardDescription>Preço base por segmento e multiplicador para mensagens Unicode.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Preço base por SMS</label>
              <Input
                type="number"
                step="0.01"
                value={settings.sms_pricing.base_price_per_sms}
                onChange={(e) =>
                  setSettings({ ...settings, sms_pricing: { ...settings.sms_pricing, base_price_per_sms: Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Multiplicador Unicode</label>
              <Input
                type="number"
                step="0.1"
                value={settings.sms_pricing.unicode_multiplier}
                onChange={(e) =>
                  setSettings({ ...settings, sms_pricing: { ...settings.sms_pricing, unicode_multiplier: Number(e.target.value) } })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limites</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Pedidos API / minuto</label>
              <Input
                type="number"
                value={settings.rate_limits.api_requests_per_minute}
                onChange={(e) =>
                  setSettings({ ...settings, rate_limits: { ...settings.rate_limits, api_requests_per_minute: Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Máx. destinatários por lote</label>
              <Input
                type="number"
                value={settings.rate_limits.bulk_max_recipients}
                onChange={(e) =>
                  setSettings({ ...settings, rate_limits: { ...settings.rate_limits, bulk_max_recipients: Number(e.target.value) } })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" variant="gradient" loading={loading}>
          <Save size={16} /> Guardar configurações
        </Button>
      </form>
    </div>
  )
}
