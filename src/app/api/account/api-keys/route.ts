import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { createApiKeySchema } from '@/lib/validations'
import { generateApiKey } from '@/lib/services/api-keys'
import { logAudit } from '@/lib/services/audit'

export async function GET() {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, is_active, created_at, revoked_at')
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })

  return jsonOk({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = createApiKeySchema.safeParse(body)
  if (!parsed.success) return jsonError('Nome inválido', 422)

  const { fullKey, prefix, hash } = generateApiKey()

  const { data, error } = await auth.supabase
    .from('api_keys')
    .insert({ user_id: auth.profile.id, name: parsed.data.name, key_prefix: prefix, key_hash: hash })
    .select('id, name, key_prefix, created_at')
    .single()

  if (error || !data) return jsonError('Não foi possível criar a chave API', 500)

  await logAudit({ actorId: auth.profile.id, action: 'api_key.created', entityType: 'api_key', entityId: data.id })

  // The full key is only ever returned once — the caller must store it now.
  return jsonOk({ data: { ...data, key: fullKey } }, 201)
}
