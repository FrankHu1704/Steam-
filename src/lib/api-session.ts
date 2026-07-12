import { createClient } from '@/lib/supabase/server'
import { jsonError } from '@/lib/api-auth'
import type { Profile } from '@/types/database'

/** Authenticates a dashboard (cookie-session) request. Used by /api/account and /api/admin routes. */
export async function authenticateSession(opts: { requireAdmin?: boolean } = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: jsonError('Não autenticado', 401) }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile) return { error: jsonError('Perfil não encontrado', 404) }
  if ((profile as Profile).status === 'blocked') return { error: jsonError('Conta bloqueada', 403) }
  if (opts.requireAdmin && (profile as Profile).role !== 'admin') return { error: jsonError('Acesso restrito a administradores', 403) }

  return { supabase, profile: profile as Profile }
}
