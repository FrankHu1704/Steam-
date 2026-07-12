import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'

export async function GET() {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase.rpc('get_user_stats', { p_user_id: auth.profile.id })
  return jsonOk({ data })
}
