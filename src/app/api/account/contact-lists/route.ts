import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { createContactListSchema } from '@/lib/validations'

export async function GET() {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase
    .from('contact_lists')
    .select('*, contacts:contacts(count)')
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })

  return jsonOk({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = createContactListSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422)

  const { data, error } = await auth.supabase
    .from('contact_lists')
    .insert({ user_id: auth.profile.id, name: parsed.data.name, description: parsed.data.description ?? null })
    .select()
    .single()

  if (error) return jsonError('Não foi possível criar a lista', 500)
  return jsonOk({ data }, 201)
}
