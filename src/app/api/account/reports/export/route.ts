import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'sem dados\n'
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))]
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = auth.supabase
    .from('sms_messages')
    .select('recipient, sender_id, message, status, message_type, segments, cost, created_at, sent_at, delivered_at')
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .limit(10000)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data } = await query
  const csv = toCsv((data ?? []) as unknown as Record<string, unknown>[])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="smsmoz-relatorio-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
