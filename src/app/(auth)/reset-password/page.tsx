'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Senha redefinida</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">A redireccionar para o seu painel...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Definir nova senha</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Escolha uma senha forte com pelo menos 8 caracteres.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nova senha</label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar nova senha</label>
          <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Redefinir senha
        </Button>
      </form>
    </div>
  )
}
