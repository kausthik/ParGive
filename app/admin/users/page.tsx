import { createServerClient } from '@/lib/supabase'

export default async function AdminUsersPage() {
  const supabase = createServerClient()

  const { data: users } = await supabase
    .from('profiles')
    .select(`
      *,
      subscriptions(plan, status, charity_percentage, charity:charities(name)),
      scores(value)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Users</h1>

      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="font-medium text-stone-900">{users?.length ?? 0} users</span>
          <button className="btn-outline text-sm py-2">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {['Name', 'Plan', 'Status', 'Charity', 'Scores', 'Joined'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {(users ?? []).map(u => {
                const sub = (u.subscriptions as unknown[])?.[0] as { plan: string; status: string; charity_percentage: number; charity: { name: string } } | undefined
                const scoreCount = (u.scores as unknown[])?.length ?? 0
                return (
                  <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900 text-sm">{u.full_name ?? '—'}</div>
                      <div className="text-xs text-stone-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 capitalize">{sub?.plan ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        sub?.status === 'active' ? 'bg-brand-50 text-brand-600'
                        : sub?.status === 'lapsed' ? 'bg-red-50 text-red-500'
                        : sub?.status === 'cancelled' ? 'bg-stone-100 text-stone-400'
                        : 'bg-stone-100 text-stone-400'
                      }`}>
                        {sub?.status ?? 'No sub'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">{sub?.charity?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{scoreCount} / 5</td>
                    <td className="px-6 py-4 text-xs text-stone-400">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
