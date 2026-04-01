import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(600),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  isFeatured: z.boolean().default(false),
})

async function requireAdmin(supabase: ReturnType<typeof createRouteClient>, userId: string) {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function POST(req: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!(await requireAdmin(supabase, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { name, description, websiteUrl, isFeatured } = parsed.data

  const { data, error } = await supabase
    .from('charities')
    .insert({
      name,
      description,
      website_url: websiteUrl || null,
      is_featured: isFeatured,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create charity' }, { status: 500 })
  }

  return NextResponse.json({ charity: data }, { status: 201 })
}
