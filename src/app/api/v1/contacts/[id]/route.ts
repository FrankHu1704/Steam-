import { NextRequest } from 'next/server'
import { authenticateApiRequest, jsonError, jsonOk } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('contacts').delete().eq('id', id).eq('user_id', auth.profile.id)

  if (error) return jsonError('Não foi possível eliminar o contacto', 500)
  return jsonOk({ deleted: true })
}
