'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Email inválido')
      return
    }

    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <MailCheck size={40} className="mx-auto text-brand-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Verifique o seu email</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Se existir uma conta associada a <strong>{email}</strong>, enviámos instruções para redefinir a sua senha.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recuperar senha</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Indique o email da sua conta e enviaremos um link para redefinir a senha.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Enviar link de recuperação
        </Button>

        <Link href="/login" className="block text-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Voltar para o login
        </Link>
      </form>
    </div>
  )
}
