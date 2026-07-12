import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk } from '@/lib/api-auth'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin.from('plans').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  return jsonOk({ data: data ?? [] })
}
