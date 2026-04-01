import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { randomDraw, algorithmicDraw, countMatches, getMatchType, calculatePrizes } from '@/lib/draw-engine'
import { calcPoolSplit } from '@/lib/stripe'
import { currentMonth } from '@/lib/utils'
import { z } from 'zod'

// Helper: verify admin
async function requireAdmin(supabase: ReturnType<typeof createRouteClient>, userId: string) {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

// POST /api/draws — simulate or publish a draw
export async function POST(req: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!(await requireAdmin(supabase, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { action, drawType = 'random', month = currentMonth() } = body

  if (!['simulate', 'publish'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use simulate or publish.' }, { status: 400 })
  }

  // Get or create draw for this month
  let { data: draw } = await supabase.from('draws').select('*').eq('month', month).single()

  if (!draw) {
    // Calculate pool from active subscribers
    const { data: view } = await supabase.from('active_subscriber_count').select('*').single()
    const monthlyRevenue = Number(view?.monthly_revenue ?? 0)
    // Approx: average 13% charity, rest to prize pool — will be refined per actual data
    const prizePool = monthlyRevenue * 0.87
    const split = calcPoolSplit(prizePool)

    const { data: newDraw, error } = await supabase
      .from('draws')
      .insert({
        month,
        draw_type: drawType,
        status: 'pending',
        jackpot_amount: 0,
        pool_match_5: split.match5,
        pool_match_4: split.match4,
        pool_match_3: split.match3,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })
    draw = newDraw
  }

  // Generate draw numbers
  let drawnNumbers: number[]
  if (drawType === 'algorithmic') {
    const { data: allScores } = await supabase
      .from('scores')
      .select('*')
    drawnNumbers = algorithmicDraw(allScores ?? [])
  } else {
    drawnNumbers = randomDraw()
  }

  // Update draw with numbers
  await supabase
    .from('draws')
    .update({
      draw_numbers: drawnNumbers,
      draw_type: drawType,
      status: action === 'publish' ? 'published' : 'simulated',
      published_at: action === 'publish' ? new Date().toISOString() : null,
    })
    .eq('id', draw.id)

  if (action === 'simulate') {
    return NextResponse.json({ drawNumbers: drawnNumbers, status: 'simulated', drawId: draw.id })
  }

  // ── PUBLISH: create draw entries and determine winners ────────────────────

  // Get all active subscribers with their scores
  const { data: subscribers } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  const userIds = (subscribers ?? []).map(s => s.user_id)

  // Get scores for all active subscribers
  const { data: allUserScores } = await supabase
    .from('scores')
    .select('user_id, value')
    .in('user_id', userIds)
    .order('played_at', { ascending: false })

  // Group scores by user (latest 5)
  const scoresByUser = new Map<string, number[]>()
  for (const s of (allUserScores ?? [])) {
    const existing = scoresByUser.get(s.user_id) ?? []
    if (existing.length < 5) {
      scoresByUser.set(s.user_id, [...existing, s.value])
    }
  }

  // Create draw entries
  const entries: {
    draw_id: string
    user_id: string
    scores_snapshot: number[]
    match_count: number
    match_type: string | null
  }[] = []
  const match5Users: string[] = []
  const match4Users: string[] = []
  const match3Users: string[] = []

  for (const [userId, scores] of Array.from(scoresByUser.entries())) {
    const matchCount = countMatches(scores, drawnNumbers)
    const matchType = getMatchType(matchCount)

    entries.push({
      draw_id: draw.id,
      user_id: userId,
      scores_snapshot: scores,
      match_count: matchCount,
      match_type: matchType,
    })

    if (matchType === 'match_5') match5Users.push(userId)
    else if (matchType === 'match_4') match4Users.push(userId)
    else if (matchType === 'match_3') match3Users.push(userId)
  }

  // Insert draw entries in batches
  if (entries.length > 0) {
    await supabase.from('draw_entries').upsert(entries, { onConflict: 'draw_id,user_id' })
  }

  // Get previous jackpot rollover
  const { data: prevDraw } = await supabase
    .from('draws')
    .select('jackpot_amount, pool_match_5')
    .eq('status', 'published')
    .neq('id', draw.id)
    .order('month', { ascending: false })
    .limit(1)
    .single()

  const jackpotRollover = match5Users.length === 0 ? (prevDraw?.jackpot_amount ?? 0) : 0

  const prizes = calculatePrizes(
    draw.pool_match_5,
    draw.pool_match_4,
    draw.pool_match_3,
    match5Users,
    match4Users,
    match3Users,
    match5Users.length === 0 ? jackpotRollover : 0,
    0,
  )

  // Update jackpot on draw record if rolling over
  if (match5Users.length === 0) {
    await supabase
      .from('draws')
      .update({ jackpot_amount: (draw.pool_match_5 + jackpotRollover) })
      .eq('id', draw.id)
  }

  // Get draw entry IDs to link winners
  const { data: entryRows } = await supabase
    .from('draw_entries')
    .select('id, user_id')
    .eq('draw_id', draw.id)
    .in('user_id', [...match5Users, ...match4Users, ...match3Users])

  const entryIdByUser = new Map((entryRows ?? []).map(e => [e.user_id, e.id]))

  // Insert winners
  const winnerRows = [
    ...match5Users.map(uid => ({
      draw_id: draw.id,
      user_id: uid,
      draw_entry_id: entryIdByUser.get(uid)!,
      match_type: 'match_5',
      prize_amount: prizes.prizePerMatch5,
      status: 'pending_verification',
      payment_status: 'pending',
    })),
    ...match4Users.map(uid => ({
      draw_id: draw.id,
      user_id: uid,
      draw_entry_id: entryIdByUser.get(uid)!,
      match_type: 'match_4',
      prize_amount: prizes.prizePerMatch4,
      status: 'pending_verification',
      payment_status: 'pending',
    })),
    ...match3Users.map(uid => ({
      draw_id: draw.id,
      user_id: uid,
      draw_entry_id: entryIdByUser.get(uid)!,
      match_type: 'match_3',
      prize_amount: prizes.prizePerMatch3,
      status: 'pending_verification',
      payment_status: 'pending',
    })),
  ]

  if (winnerRows.length > 0) {
    await supabase.from('winners').insert(winnerRows)
  }

  return NextResponse.json({
    drawNumbers: drawnNumbers,
    status: 'published',
    drawId: draw.id,
    winners: {
      match5: match5Users.length,
      match4: match4Users.length,
      match3: match3Users.length,
      jackpotRollover: match5Users.length === 0,
      prizePerMatch5: prizes.prizePerMatch5,
      prizePerMatch4: prizes.prizePerMatch4,
      prizePerMatch3: prizes.prizePerMatch3,
    },
  })
}
