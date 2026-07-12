import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'

export async function GET() {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase
    .from('notifications')
    .select('*')
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return jsonOk({ data: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))
  if (body.mark_all_read) {
    await auth.supabase.from('notifications').update({ is_read: true }).eq('user_id', auth.profile.id)
    return jsonOk({ updated: true })
  }

  if (body.id) {
    await auth.supabase.from('notifications').update({ is_read: true }).eq('id', body.id).eq('user_id', auth.profile.id)
    return jsonOk({ updated: true })
  }

  return jsonOk({ updated: false })
}
