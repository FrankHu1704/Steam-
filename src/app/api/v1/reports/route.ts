import { NextRequest } from 'next/server'
import { authenticateApiRequest, jsonOk } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SmsStatus } from '@/types/database'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? '20')))

  const admin = createAdminClient()
  let query = admin
    .from('sms_messages')
    .select('id, recipient, sender_id, status, segments, cost, message_type, sent_at, delivered_at, created_at', { count: 'exact' })
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (status) query = query.eq('status', status as SmsStatus)

  const { data, count, error } = await query
  if (error) {
    return jsonOk({ data: [], pagination: { page, page_size: pageSize, total: 0 } }, 200)
  }

  return jsonOk({
    data,
    pagination: { page, page_size: pageSize, total: count ?? 0 },
  })
}
