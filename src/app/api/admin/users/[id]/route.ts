import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { logAudit } from '@/lib/services/audit'
import type { Profile } from '@/types/database'

const updateUserSchema = z.object({
  status: z.enum(['pending', 'active', 'blocked']).optional(),
  role: z.enum(['client', 'admin']).optional(),
  plan_id: z.string().uuid().nullable().optional(),
  credit_adjustment: z.number().optional(),
  adjustment_reason: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422)

  const { status, role, plan_id, credit_adjustment, adjustment_reason } = parsed.data

  if (status || role || plan_id !== undefined) {
    const update: Partial<Profile> = {}
    if (status) update.status = status
    if (role) update.role = role
    if (plan_id !== undefined) update.plan_id = plan_id

    const { error } = await auth.supabase.from('profiles').update(update).eq('id', id)
    if (error) return jsonError('Não foi possível actualizar o utilizador', 500)

    await logAudit({ actorId: auth.profile.id, action: 'user.updated', entityType: 'profile', entityId: id, metadata: update })
  }

  if (typeof credit_adjustment === 'number' && credit_adjustment !== 0) {
    const { error } = await auth.supabase.rpc('adjust_credits', {
      p_user_id: id,
      p_credits: credit_adjustment,
      p_type: 'admin_adjustment',
      p_reference: null,
      p_metadata: { reason: adjustment_reason ?? null },
      p_created_by: auth.profile.id,
    })
    if (error) return jsonError('Não foi possível ajustar o saldo', 400)

    await logAudit({
      actorId: auth.profile.id,
      action: 'user.credit_adjustment',
      entityType: 'profile',
      entityId: id,
      metadata: { amount: credit_adjustment, reason: adjustment_reason ?? null },
    })
  }

  const { data } = await auth.supabase.from('profiles').select('*').eq('id', id).single()
  return jsonOk({ data })
}
