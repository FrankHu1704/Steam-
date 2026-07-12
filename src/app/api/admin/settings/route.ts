import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { logAudit } from '@/lib/services/audit'

export async function GET() {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase.from('system_settings').select('*')
  const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]))
  return jsonOk({ data: settings })
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return jsonError('Dados inválidos', 422)

  for (const [key, value] of Object.entries(body)) {
    await auth.supabase.from('system_settings').upsert({ key, value, updated_by: auth.profile.id, updated_at: new Date().toISOString() })
  }

  await logAudit({ actorId: auth.profile.id, action: 'settings.updated', entityType: 'system_settings', metadata: body })
  return jsonOk({ updated: true })
}
