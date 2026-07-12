import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'
import type { SmsStatus } from '@/types/database'

export async function GET(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? '20')))
  const status = searchParams.get('status')

  let query = auth.supabase
    .from('sms_messages')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status as SmsStatus)

  const { data, count } = await query
  return jsonOk({ data: data ?? [], pagination: { page, page_size: pageSize, total: count ?? 0 } })
}
