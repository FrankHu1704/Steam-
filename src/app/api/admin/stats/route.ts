import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'

export async function GET() {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase.rpc('get_admin_stats')
  return jsonOk({ data })
}
