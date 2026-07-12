import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'
import type { SmsStatus } from '@/types/database'

export async function GET(req: NextRequest) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? '25')))

  let query = auth.supabase
    .from('sms_messages')
    .select('*, profiles!sms_messages_user_id_fkey(full_name, company_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status as SmsStatus)
  if (search) query = query.or(`recipient.ilike.%${search}%,message.ilike.%${search}%`)

  const { data, count } = await query
  return jsonOk({ data: data ?? [], pagination: { page, page_size: pageSize, total: count ?? 0 } })
}
