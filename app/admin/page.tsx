import { createServerClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createServerClient()

  const [
    { count: activeSubs },
    { count: totalUsers },
    { data: poolView },
    { data: charityTotal },
    { data: recentActivity },
    { data: pendingWinners },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('active_subscriber_count').select('*').single(),
    supabase.from('charities').select('total_raised'),
    supabase.from('profiles').select('full_name, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('winners').select('*', { count: 'exact', head: true }).eq('status', 'pending_verification'),
  ])

  const monthlyPool = Number(poolView?.monthly_revenue ?? 0) * 0.85
  const totalCharity = (charityTotal ?? []).reduce((s, c) => s + Number(c.total_raised), 0)

  const stats = [
    { label: 'Active subscribers', value: (activeSubs ?? 0).toLocaleString(), delta: '+142 this month' },
    { label: 'Monthly prize pool', value: formatCurrency(monthlyPool), delta: 'Est. from active subs' },
    { label: 'Total users', value: (totalUsers ?? 0).toLocaleString() },
    { label: 'Total charity raised', value: formatCurrency(totalCharity), delta: 'All time' },
  ]

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className="text-xs text-stone-400 mb-2">{s.label}</div>
            <div className="font-serif text-2xl font-bold text-stone-900">{s.value}</div>
            {s.delta && <div className="text-xs text-brand-500 mt-1">{s.delta}</div>}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(pendingWinners?.count ?? 0) > 0 && (
        <Link href="/admin/winners" className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 hover:border-amber-200 transition-colors">
          <div>
            <p className="font-medium text-amber-900 text-sm">
              {pendingWinners?.count} winner{pendingWinners?.count !== 1 ? 's' : ''} awaiting verification
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Review and approve proof submissions</p>
          </div>
          <span className="text-amber-600 text-sm">Review →</span>
        </Link>
      )}

      {/* Recent signups */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-medium text-stone-900">Recent signups</h2>
          <Link href="/admin/users" className="text-sm text-brand-500 hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-stone-50">
          {(recentActivity ?? []).map((u, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <span className="text-sm text-stone-700">{u.full_name ?? 'Unknown'}</span>
              <span className="text-xs text-stone-400">
                {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
