'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ShieldCheck, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ full_name: '', company_name: '', phone: '', default_sender_id: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/account/profile')
      .then((r) => r.json())
      .then((res) => {
        setProfile(res?.data ?? null)
        if (res?.data) {
          setForm({
            full_name: res.data.full_name ?? '',
            company_name: res.data.company_name ?? '',
            phone: res.data.phone ?? '',
            default_sender_id: res.data.default_sender_id ?? '',
          })
        }
      })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao guardar perfil', variant: 'error' })
      return
    }
    toast({ title: 'Perfil actualizado', variant: 'success' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gira as informações da sua conta e preferências de envio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome completo</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Empresa</label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Telefone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID por omissão</label>
              <Input maxLength={11} value={form.default_sender_id} onChange={(e) => setForm({ ...form, default_sender_id: e.target.value })} />
              <p className="mt-1 text-xs text-slate-400">Máximo 11 caracteres alfanuméricos.</p>
            </div>

            <Button type="submit" variant="gradient" loading={loading}>
              <Save size={16} /> Guardar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Palavra-passe e autenticação de dois factores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Palavra-passe</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recomendamos alterar a sua senha periodicamente.</p>
            </div>
            <Link href="/forgot-password">
              <Button variant="outline" size="sm">
                Alterar senha
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Autenticação de dois factores</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Camada adicional de segurança para a sua conta.</p>
              </div>
            </div>
            <Badge variant={profile?.two_fa_enabled ? 'success' : 'default'}>{profile?.two_fa_enabled ? 'Activo' : 'Inactivo'}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
