import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { createContactSchema } from '@/lib/validations'
import { normalizeMozPhone } from '@/lib/utils'
import type { Contact } from '@/types/database'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = createContactSchema.partial().safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422)

  const update: Partial<Contact> = { ...parsed.data }
  if (parsed.data.phone) {
    const phone = normalizeMozPhone(parsed.data.phone)
    if (!phone) return jsonError('Número de telefone inválido', 422)
    update.phone = phone
  }

  const { data, error } = await auth.supabase
    .from('contacts')
    .update(update)
    .eq('id', id)
    .eq('user_id', auth.profile.id)
    .select()
    .single()

  if (error || !data) return jsonError('Não foi possível actualizar o contacto', 500)
  return jsonOk({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { id } = await params
  const { error } = await auth.supabase.from('contacts').delete().eq('id', id).eq('user_id', auth.profile.id)
  if (error) return jsonError('Não foi possível eliminar o contacto', 500)
  return jsonOk({ deleted: true })
}
