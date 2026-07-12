import { authenticateSession } from '@/lib/api-session'
import { jsonOk } from '@/lib/api-auth'

export async function GET() {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const since = new Date()
  since.setDate(since.getDate() - 13)
  since.setHours(0, 0, 0, 0)

  const { data } = await auth.supabase
    .from('sms_messages')
    .select('created_at, status')
    .eq('user_id', auth.profile.id)
    .gte('created_at', since.toISOString())

  const buckets = new Map<string, { date: string; sent: number; delivered: number; failed: number }>()
  for (let i = 0; i < 14; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, sent: 0, delivered: 0, failed: 0 })
  }

  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.sent += 1
    if (row.status === 'delivered') bucket.delivered += 1
    if (row.status === 'failed') bucket.failed += 1
  }

  return jsonOk({ data: Array.from(buckets.values()) })
}
