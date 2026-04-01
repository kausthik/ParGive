import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ScoreCard from '@/components/dashboard/ScoreCard'
import DrawCard from '@/components/dashboard/DrawCard'
import CharityCard from '@/components/dashboard/CharityCard'
import WinningsCard from '@/components/dashboard/WinningsCard'
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const userId = session.user.id

  // Fetch all dashboard data in parallel
  const [
    { data: profile },
    { data: subscription },
    { data: scores },
    { data: lastDraw },
    { data: winnings },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('subscriptions')
      .select('*, charity:charities(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single(),
    supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(5),
    supabase
      .from('draws')
      .select('*, draw_entries!inner(*)')
      .eq('draw_entries.user_id', userId)
      .eq('status', 'published')
      .order('month', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('winners')
      .select('*, draw:draws(month)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  // Upcoming draw (current month)
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data: upcomingDraw } = await supabase
    .from('draws')
    .select('*')
    .eq('month', currentMonth)
    .single()

  const totalWon = (winnings ?? []).reduce((sum, w) => sum + Number(w.prize_amount), 0)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Welcome back, {firstName}.</h1>
          <p className="text-stone-400 text-sm mt-1">Member since {new Date(profile?.created_at ?? '').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>
        {subscription ? (
          <div className="badge-active">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            Active · renews {new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        ) : (
          <a href="/subscribe" className="badge-lapsed">No active subscription</a>
        )}
      </div>

      {/* Subscription warning banner */}
      {!subscription && <SubscriptionBanner />}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScoreCard scores={scores ?? []} hasSubscription={!!subscription} />
        <DrawCard
          upcomingDraw={upcomingDraw ?? null}
          lastDraw={lastDraw ?? null}
          userScores={(scores ?? []).map(s => s.value)}
        />
        <CharityCard subscription={subscription ?? null} />
        <WinningsCard winnings={winnings ?? []} totalWon={totalWon} />
      </div>
    </div>
  )
}
