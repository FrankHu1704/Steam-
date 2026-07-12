'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', companyName: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = registerSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, company_name: form.companyName, phone: form.phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message.includes('already registered') ? 'Este email já está registado.' : 'Não foi possível criar a conta.')
      return
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Verifique o seu email</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enviámos um link de confirmação para <strong>{form.email}</strong>. Clique no link para activar a sua conta.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Criar a sua conta</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Entrar
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome completo</label>
            <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Empresa (opcional)</label>
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Telefone</label>
          <Input required placeholder="84 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
            <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar senha</label>
            <Input type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ao criar uma conta, aceita os nossos Termos de Serviço e Política de Privacidade.
        </p>

        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Criar conta grátis
        </Button>
      </form>
    </div>
  )
}
