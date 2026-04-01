import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createRouteClient } from '@/lib/supabase/route'
import type Stripe from 'stripe'

// Disable body parsing — Stripe needs the raw body
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createRouteClient()

  switch (event.type) {
    // ── New subscription created via Stripe Checkout ──────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const meta = session.metadata ?? {}
      const subId = session.subscription as string

      const stripeSub = await stripe.subscriptions.retrieve(subId)

      await supabase.from('subscriptions').upsert({
        user_id: meta.userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subId,
        plan: meta.planId as 'monthly' | 'yearly',
        status: 'active',
        charity_id: meta.charityId,
        charity_percentage: parseInt(meta.charityPercentage, 10),
        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' })

      // Increment charity member count
      await supabase.rpc('increment_charity_members', { p_charity_id: meta.charityId })
      break
    }

    // ── Subscription renewed ──────────────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (!invoice.subscription) break

      const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription as string)

      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription as string)
      break
    }

    // ── Payment failed ────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      if (!invoice.subscription) break

      await supabase
        .from('subscriptions')
        .update({ status: 'lapsed', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', invoice.subscription as string)
      break
    }

    // ── Subscription cancelled ────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription

      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    // ── Subscription updated (plan change, charity change via portal) ─────
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const meta = sub.metadata ?? {}

      await supabase
        .from('subscriptions')
        .update({
          status: sub.status === 'active' ? 'active' : 'lapsed',
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          ...(meta.charityId ? { charity_id: meta.charityId } : {}),
          ...(meta.charityPercentage ? { charity_percentage: parseInt(meta.charityPercentage, 10) } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    default:
      // Unhandled event — fine to ignore
      break
  }

  return NextResponse.json({ received: true })
}
