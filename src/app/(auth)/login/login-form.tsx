'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blockedNotice = searchParams.get('error') === 'blocked'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      setError('Email ou senha incorrectos.')
      return
    }

    router.push(searchParams.get('redirect') || '/dashboard')
    router.refresh()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Entrar na sua conta</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Ainda não tem conta?{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Criar conta grátis
        </Link>
      </p>

      {blockedNotice && (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          A sua conta encontra-se bloqueada. Contacte o suporte para mais informações.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.co.mz" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Entrar
        </Button>
      </form>
    </div>
  )
}
