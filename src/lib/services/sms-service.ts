import { createAdminClient } from '@/lib/supabase/admin'
import { getSmsProvider } from '@/lib/sms/provider'
import { calculateSmsCost } from '@/lib/sms/pricing'
import { normalizeMozPhone, personalizeMessage } from '@/lib/utils'
import type { SmsType } from '@/types/database'

export interface SendSmsParams {
  userId: string
  apiKeyId?: string | null
  batchId?: string | null
  to: string
  message: string
  senderId?: string
  flash?: boolean
  messageType?: SmsType
  scheduledAt?: string | null
}

export interface SendSmsOutcome {
  ok: boolean
  messageId?: string
  cost?: number
  error?: string
}

/**
 * Sends (or schedules) a single SMS: validates the destination, prices the
 * message, atomically charges credits, dispatches through the configured
 * provider, then reconciles the message row + refunds on failure.
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsOutcome> {
  const admin = createAdminClient()
  const phone = normalizeMozPhone(params.to)
  if (!phone) return { ok: false, error: 'INVALID_PHONE' }

  const { isUnicode, segments, cost } = calculateSmsCost(params.message)
  const senderId = (params.senderId || 'SMSMoz').slice(0, 11)
  const isScheduled = !!params.scheduledAt && new Date(params.scheduledAt).getTime() > Date.now()

  const { data: message, error: insertError } = await admin
    .from('sms_messages')
    .insert({
      user_id: params.userId,
      api_key_id: params.apiKeyId ?? null,
      batch_id: params.batchId ?? null,
      recipient: phone,
      sender_id: senderId,
      message: params.message,
      message_type: params.messageType ?? 'single',
      status: isScheduled ? 'scheduled' : 'queued',
      segments,
      is_unicode: isUnicode,
      is_flash: params.flash ?? false,
      cost,
      scheduled_at: params.scheduledAt ?? null,
    })
    .select('id')
    .single()

  if (insertError || !message) return { ok: false, error: 'INSERT_FAILED' }

  try {
    await admin.rpc('charge_sms', { p_user_id: params.userId, p_cost: cost, p_message_id: message.id })
  } catch {
    await admin.from('sms_messages').update({ status: 'rejected', error_message: 'INSUFFICIENT_CREDITS' }).eq('id', message.id)
    return { ok: false, error: 'INSUFFICIENT_CREDITS', messageId: message.id }
  }

  if (isScheduled) {
    return { ok: true, messageId: message.id, cost }
  }

  return dispatchNow(message.id, phone, senderId, params.message, params.flash ?? false, params.userId, cost)
}

async function dispatchNow(
  messageId: string,
  phone: string,
  senderId: string,
  text: string,
  flash: boolean,
  userId: string,
  cost: number
): Promise<SendSmsOutcome> {
  const admin = createAdminClient()
  const provider = getSmsProvider()
  const result = await provider.send({ to: phone, from: senderId, message: text, flash })

  if (result.success) {
    await admin
      .from('sms_messages')
      .update({ status: 'sent', sent_at: new Date().toISOString(), external_id: result.externalId, delivered_at: new Date().toISOString() })
      .eq('id', messageId)
    // Simulated delivery confirmation — in production this is driven by the
    // gateway's delivery-receipt webhook rather than being set synchronously.
    await admin.from('sms_messages').update({ status: 'delivered' }).eq('id', messageId)
    return { ok: true, messageId, cost }
  }

  await admin.from('sms_messages').update({ status: 'failed', error_message: result.error }).eq('id', messageId)
  await admin.rpc('adjust_credits', {
    p_user_id: userId,
    p_credits: cost,
    p_type: 'refund',
    p_reference: messageId,
    p_metadata: { reason: result.error },
  })
  return { ok: false, error: result.error ?? 'PROVIDER_ERROR', messageId }
}

export type BulkRecipient = string | { phone: string; name?: string }

export interface BulkSendParams {
  userId: string
  apiKeyId?: string | null
  recipients: BulkRecipient[]
  message: string
  senderId?: string
  flash?: boolean
  scheduledAt?: string | null
  batchName?: string
}

export interface BulkSendOutcome {
  ok: boolean
  batchId?: string
  accepted: number
  rejected: number
  totalCost: number
  error?: string
}

export async function sendBulkSms(params: BulkSendParams): Promise<BulkSendOutcome> {
  const admin = createAdminClient()

  const normalized = params.recipients.map((r) => {
    const raw = typeof r === 'string' ? r : r.phone
    const name = typeof r === 'string' ? undefined : r.name
    return { phone: normalizeMozPhone(raw), name }
  })

  const seen = new Set<string>()
  const validRecipients: { phone: string; name?: string }[] = []
  for (const r of normalized) {
    if (!r.phone || seen.has(r.phone)) continue
    seen.add(r.phone)
    validRecipients.push({ phone: r.phone, name: r.name })
  }

  if (validRecipients.length === 0) {
    return { ok: false, accepted: 0, rejected: params.recipients.length, totalCost: 0, error: 'NO_VALID_RECIPIENTS' }
  }

  const { cost: unitCost } = calculateSmsCost(params.message)
  const totalCost = Math.round(unitCost * validRecipients.length * 100) / 100

  const { data: batch, error: batchError } = await admin
    .from('sms_batches')
    .insert({
      user_id: params.userId,
      name: params.batchName ?? `Envio em massa — ${new Date().toLocaleDateString('pt-MZ')}`,
      total_recipients: validRecipients.length,
      total_cost: totalCost,
      status: params.scheduledAt ? 'scheduled' : 'queued',
      scheduled_at: params.scheduledAt ?? null,
    })
    .select('id')
    .single()

  if (batchError || !batch) {
    return { ok: false, accepted: 0, rejected: validRecipients.length, totalCost: 0, error: 'BATCH_CREATE_FAILED' }
  }

  let accepted = 0
  let rejected = params.recipients.length - validRecipients.length

  // NOTE: for very large lists (tens of thousands), this loop should be
  // handed off to a background queue/worker rather than run inline in the
  // request. Kept inline here to keep the reference implementation simple.
  for (const recipient of validRecipients) {
    const outcome = await sendSms({
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      batchId: batch.id,
      to: recipient.phone,
      message: personalizeMessage(params.message, recipient.name),
      senderId: params.senderId,
      flash: params.flash,
      messageType: 'bulk',
      scheduledAt: params.scheduledAt,
    })
    if (outcome.ok) accepted += 1
    else rejected += 1
  }

  await admin.from('sms_batches').update({ status: params.scheduledAt ? 'scheduled' : 'sent' }).eq('id', batch.id)

  return { ok: accepted > 0, batchId: batch.id, accepted, rejected, totalCost }
}
