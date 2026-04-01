import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { validateScore } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  value: z.number().int().min(1).max(45),
  playedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Check active subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Active subscription required to add scores' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { value, playedAt } = parsed.data

  // Extra validation
  const validationError = validateScore(value)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // Prevent future dates
  if (new Date(playedAt) > new Date()) {
    return NextResponse.json({ error: 'Score date cannot be in the future' }, { status: 400 })
  }

  // Insert — the DB trigger enforces the 5-score rolling limit
  const { data, error } = await supabase
    .from('scores')
    .insert({ user_id: session.user.id, value, played_at: playedAt })
    .select('id')
    .single()

  if (error) {
    console.error('Score insert error:', error)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', session.user.id)
    .order('played_at', { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }

  return NextResponse.json(data)
}
