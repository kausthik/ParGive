import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'

async function requireAdmin(supabase: ReturnType<typeof createRouteClient>, userId: string) {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!(await requireAdmin(supabase, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('winners')
    .select(`
      *,
      profiles:user_id(full_name, email),
      draws:draw_id(month)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  return NextResponse.json({ winners: data })
}
