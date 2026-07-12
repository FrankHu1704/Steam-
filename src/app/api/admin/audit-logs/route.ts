import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? '30')))

  const { data, count } = await auth.supabase
    .from('audit_logs')
    .select('*, profiles(full_name, company_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  return jsonOk({ data: data ?? [], pagination: { page, page_size: pageSize, total: count ?? 0 } })
}
