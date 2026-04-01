import { createServerClient } from '@/lib/supabase/server'
import { formatCurrency, formatMonth } from '@/lib/utils'

export default async function AdminReportsPage() {
  const supabase = createServerClient()

  const [
    { count: totalUsers },
    { count: activeSubs },
    { count: cancelledSubs },
    { data: draws },
    { data: charities },
    { data: winners },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('draws').select('*').eq('status', 'published').order('month', { ascending: false }).limit(12),
    supabase.from('charities').select('name, total_raised, member_count').eq('is_active', true).order('total_raised', { ascending: false }),
    supabase.from('winners').select('prize_amount, status, payment_status'),
  ])

  const churnRate = totalUsers ? +((cancelledSubs ?? 0) / (totalUsers ?? 1) * 100).toFixed(1) : 0
  const totalPaidOut = (winners ?? [])
    .filter(w => w.payment_status === 'paid')
    .reduce((s, w) => s + Number(w.prize_amount), 0)
  const totalPending = (winners ?? [])
    .filter(w => w.payment_status === 'pending' && w.status === 'approved')
    .reduce((s, w) => s + Number(w.prize_amount), 0)
  const totalCharityRaised = (charities ?? []).reduce((s, c) => s + Number(c.total_raised), 0)

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Reports & analytics</h1>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total users', value: (totalUsers ?? 0).toLocaleString() },
          { label: 'Active subscribers', value: (activeSubs ?? 0).toLocaleString() },
          { label: 'Churn rate', value: `${churnRate}%` },
          { label: 'Draws run', value: (draws ?? []).length.toString() },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="text-xs text-stone-400 mb-2">{s.label}</div>
            <div className="font-serif text-2xl font-bold text-stone-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Prize payouts */}
        <div className="card">
          <h2 className="font-medium text-stone-900 mb-5">Prize payouts</h2>
          <div className="space-y-3">
            {[
              { label: 'Total paid out (all time)', val: totalPaidOut, color: 'text-brand-600' },
              { label: 'Pending payment', val: totalPending, color: 'text-amber-600' },
              { label: 'Total charity raised', val: totalCharityRaised, color: 'text-brand-500' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-2.5 border-b border-stone-50">
                <span className="text-sm text-stone-500">{r.label}</span>
                <span className={`font-serif text-lg font-bold ${r.color}`}>{formatCurrency(r.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Charity breakdown */}
        <div className="card">
          <h2 className="font-medium text-stone-900 mb-5">Charity breakdown</h2>
          <div className="space-y-3">
            {(charities ?? []).map(c => {
              const pct = totalCharityRaised > 0 ? (c.total_raised / totalCharityRaised * 100) : 0
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-600">{c.name}</span>
                    <span className="font-medium text-stone-800">{formatCurrency(c.total_raised)}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Draw history table */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-medium text-stone-900">Draw history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {['Month', 'Numbers drawn', 'Pool (5-match)', 'Pool (4-match)', 'Pool (3-match)', 'Status'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {(draws ?? []).map(d => (
                <tr key={d.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-stone-800">{formatMonth(d.month)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {(d.draw_numbers ?? []).map((n: number) => (
                        <span key={n} className="w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                          {n}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">{formatCurrency(d.pool_match_5 + d.jackpot_amount)}</td>
                  <td className="px-6 py-4 text-sm text-stone-600">{formatCurrency(d.pool_match_4)}</td>
                  <td className="px-6 py-4 text-sm text-stone-600">{formatCurrency(d.pool_match_3)}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full capitalize">
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(draws ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-stone-400">
                    No draws published yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
