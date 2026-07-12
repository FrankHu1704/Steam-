import { createAdminClient } from '@/lib/supabase/admin'
import type { PaymentMethod } from '@/types/database'

async function createStripeCheckoutUrl(transactionId: string, amount: number, credits: number): Promise<string | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `SMSMoz — ${credits} créditos SMS` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { transaction_id: transactionId },
    success_url: `${appUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
  })

  return session.url
}

export interface InitiatePaymentInput {
  userId: string
  amount: number
  credits: number
  method: PaymentMethod
  phone?: string
  planId?: string | null
}

export interface InitiatePaymentResult {
  transactionId: string
  status: 'pending' | 'completed'
  redirectUrl?: string
  instructions?: string
}

/**
 * Creates a pending transaction and kicks off the provider-specific flow.
 * M-Pesa/e-Mola push a USSD prompt to the user's phone; card/PayPal/Stripe
 * return a redirect URL to a hosted checkout page. Actual gateway calls are
 * stubbed pending real merchant credentials (see .env.example) — wire the
 * marked TODOs to the provider's SDK/API before going live.
 */
export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  const admin = createAdminClient()

  const { data: transaction, error } = await admin
    .from('transactions')
    .insert({
      user_id: input.userId,
      type: 'purchase',
      amount: input.amount,
      credits: input.credits,
      payment_method: input.method,
      payment_status: 'pending',
      reference: `${input.method}_${Date.now()}`,
      metadata: { plan_id: input.planId ?? null, phone: input.phone ?? null },
    })
    .select('id, reference')
    .single()

  if (error || !transaction) throw new Error('Não foi possível criar a transacção')

  switch (input.method) {
    case 'mpesa':
    case 'emola':
      // TODO: call the M-Pesa/e-Mola C2B API to push a USSD payment prompt to `input.phone`.
      return {
        transactionId: transaction.id,
        status: 'pending',
        instructions: `Confirme o pagamento de ${input.amount} MZN no seu telemóvel (prompt ${input.method === 'mpesa' ? 'M-Pesa' : 'e-Mola'}).`,
      }
    case 'stripe': {
      const stripeUrl = await createStripeCheckoutUrl(transaction.id, input.amount, input.credits)
      return {
        transactionId: transaction.id,
        status: 'pending',
        redirectUrl: stripeUrl ?? `/dashboard/billing/checkout/stripe?tx=${transaction.id}`,
      }
    }
    case 'paypal':
      // TODO: create a PayPal order via the Orders v2 API and return the approval link.
      return { transactionId: transaction.id, status: 'pending', redirectUrl: `/dashboard/billing/checkout/paypal?tx=${transaction.id}` }
    case 'card':
      return { transactionId: transaction.id, status: 'pending', redirectUrl: `/dashboard/billing/checkout/card?tx=${transaction.id}` }
    default:
      return { transactionId: transaction.id, status: 'pending' }
  }
}

/** Marks a pending transaction as completed and credits the user's account. Called by webhooks/confirm handlers. */
export async function confirmPayment(transactionId: string, providerReference?: string) {
  const admin = createAdminClient()

  const { data: tx } = await admin.from('transactions').select('*').eq('id', transactionId).single()
  if (!tx) throw new Error('Transacção não encontrada')
  if (tx.payment_status === 'completed') return tx

  await admin
    .from('transactions')
    .update({ payment_status: 'completed', metadata: { ...(tx.metadata as object), provider_reference: providerReference } })
    .eq('id', transactionId)

  await admin.rpc('adjust_credits', {
    p_user_id: tx.user_id,
    p_credits: tx.credits,
    p_type: 'purchase',
    p_reference: transactionId,
    p_metadata: { payment_method: tx.payment_method },
  })

  await admin.from('notifications').insert({
    user_id: tx.user_id,
    title: 'Pagamento confirmado',
    message: `O seu pagamento de ${tx.amount} MZN foi confirmado e ${tx.credits} créditos foram adicionados à sua conta.`,
    type: 'success',
  })

  return tx
}

export async function failPayment(transactionId: string, reason?: string) {
  const admin = createAdminClient()
  await admin
    .from('transactions')
    .update({ payment_status: 'failed', metadata: { failure_reason: reason ?? null } })
    .eq('id', transactionId)
    .eq('payment_status', 'pending')
}
