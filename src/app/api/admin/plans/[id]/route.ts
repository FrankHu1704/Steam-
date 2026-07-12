import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { data, error } = await auth.supabase.from('plans').update(body).eq('id', id).select().single()
  if (error) return jsonError('Não foi possível actualizar o plano', 500)
  return jsonOk({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { id } = await params
  const { error } = await auth.supabase.from('plans').update({ is_active: false }).eq('id', id)
  if (error) return jsonError('Não foi possível remover o plano', 500)
  return jsonOk({ deleted: true })
}
