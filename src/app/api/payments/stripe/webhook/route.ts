import { NextRequest, NextResponse } from 'next/server'
import { confirmPayment } from '@/lib/payments/service'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  if (!secret || !signature) {
    return NextResponse.json({ received: false, error: 'Stripe webhook not configured' }, { status: 501 })
  }

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as import('stripe').Stripe.Checkout.Session
    const transactionId = session.metadata?.transaction_id
    if (transactionId) {
      await confirmPayment(transactionId, session.payment_intent as string)
    }
  }

  return NextResponse.json({ received: true })
}
