import { createAdminClient } from '@/lib/supabase/admin'

interface LogAuditInput {
  actorId?: string | null
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

export async function logAudit(input: LogAuditInput) {
  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
  })
}
