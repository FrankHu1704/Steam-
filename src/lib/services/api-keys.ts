import { randomBytes, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const KEY_PREFIX = 'smz'

export function generateApiKey() {
  const secret = randomBytes(24).toString('hex')
  const prefix = `${KEY_PREFIX}_${randomBytes(3).toString('hex')}`
  const fullKey = `${prefix}_${secret}`
  const hash = hashApiKey(fullKey)
  return { fullKey, prefix, hash }
}

export function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

/** Resolves an API key string to its owning profile, or null if invalid/revoked. */
export async function resolveApiKey(rawKey: string) {
  if (!rawKey || !rawKey.startsWith(`${KEY_PREFIX}_`)) return null

  const hash = hashApiKey(rawKey)
  const admin = createAdminClient()

  const { data: apiKey } = await admin
    .from('api_keys')
    .select('id, user_id, is_active')
    .eq('key_hash', hash)
    .maybeSingle()

  if (!apiKey || !apiKey.is_active) return null

  const { data: profile } = await admin.from('profiles').select('*').eq('id', apiKey.user_id).maybeSingle()
  if (!profile || profile.status !== 'active') return null

  admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(() => {})

  return { apiKeyId: apiKey.id as string, profile }
}
