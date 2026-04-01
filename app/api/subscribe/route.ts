import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { stripe, PLAN_PRICES } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  planId: z.enum(['monthly', 'yearly']),
  charityId: z.string().uuid(),
  charityPercentage: z.number().int().min(10).max(50),
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { planId, charityId, charityPercentage } = parsed.data

    const { data: charity } = await supabase
      .from('charities')
      .select('id')
      .eq('id', charityId)
      .eq('is_active', true)
      .single()

    if (!charity) {
      return NextResponse.json({ error: 'Invalid charity' }, { status: 400 })
    }

    const priceId = PLAN_PRICES[planId]
    console.log('PLAN:', planId)
    console.log('PRICE ID:', priceId)
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

   
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: session.user.email,
      success_url: `${appUrl}/dashboard?subscribed=1`,
      cancel_url: `${appUrl}/subscribe`,
    })

    return NextResponse.json({ checkoutUrl: checkoutSession.url })

  } catch (error) {
    console.error('🔥 Stripe/API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong on server' },
      { status: 500 }
    )
  }
}