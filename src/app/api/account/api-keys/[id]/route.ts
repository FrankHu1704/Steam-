import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { logAudit } from '@/lib/services/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { id } = await params
  const { error } = await auth.supabase
    .from('api_keys')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.profile.id)

  if (error) return jsonError('Não foi possível revogar a chave', 500)

  await logAudit({ actorId: auth.profile.id, action: 'api_key.revoked', entityType: 'api_key', entityId: id })
  return jsonOk({ revoked: true })
}
