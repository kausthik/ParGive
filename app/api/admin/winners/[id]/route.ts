import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['approve', 'reject', 'mark_paid']),
})

async function requireAdmin(supabase: ReturnType<typeof createRouteClient>, userId: string) {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!(await requireAdmin(supabase, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const { action } = parsed.data

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (action === 'approve') {
    updates.status = 'approved'
  } else if (action === 'reject') {
    updates.status = 'rejected'
  } else if (action === 'mark_paid') {
    updates.status = 'paid'
    updates.payment_status = 'paid'
    updates.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('winners')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  return NextResponse.json({ winner: data })
}
