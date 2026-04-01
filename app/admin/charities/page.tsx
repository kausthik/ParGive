import { createServerClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import AddCharityForm from '@/components/admin/AddCharityForm'

export default async function AdminCharitiesPage() {
  const supabase = createServerClient()

  const { data: charities } = await supabase
    .from('charities')
    .select('*')
    .order('total_raised', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Charities</h1>
        <AddCharityForm />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {['Charity', 'Members', 'Total raised', 'Featured', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {(charities ?? []).map(c => (
              <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-stone-900 text-sm">{c.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5 max-w-xs truncate">{c.description}</div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">{c.member_count.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="font-serif text-sm font-bold text-stone-800">
                    {formatCurrency(c.total_raised)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    c.is_featured ? 'bg-gold-100 text-gold-600' : 'bg-stone-100 text-stone-400'
                  }`}>
                    {c.is_featured ? 'Featured' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    c.is_active ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-brand-500 hover:underline">Edit</button>
                    <button className="text-xs text-red-400 hover:underline">
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
