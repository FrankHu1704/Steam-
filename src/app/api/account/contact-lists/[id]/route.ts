import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { id } = await params
  const { error } = await auth.supabase.from('contact_lists').delete().eq('id', id).eq('user_id', auth.profile.id)
  if (error) return jsonError('Não foi possível eliminar a lista', 500)
  return jsonOk({ deleted: true })
}
