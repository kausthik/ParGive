import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // RLS ensures users can only delete their own scores
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
