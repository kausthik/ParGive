import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { Subscription } from '@/types'

interface Props {
  subscription: Subscription | null
}

export default function CharityCard({ subscription }: Props) {
  if (!subscription) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-10">
        <div className="text-3xl mb-3">🌱</div>
        <p className="text-sm text-stone-500 mb-4">Subscribe to start supporting a charity</p>
        <Link href="/subscribe" className="btn-primary text-sm py-2 px-5">Subscribe now</Link>
      </div>
    )
  }

  const charity = subscription.charity
  const base = subscription.plan === 'yearly' ? 89.99 / 12 : 9.99
  const monthlyContrib = +(base * subscription.charity_percentage / 100).toFixed(2)
  const yearlyContrib = +(monthlyContrib * 12).toFixed(2)

  // Estimate total donated (months since subscription start)
  const monthsActive = Math.max(1, Math.round(
    (Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  ))
  const totalDonated = +(monthlyContrib * monthsActive).toFixed(2)

  return (
    <div className="card">
      <h2 className="section-label mb-5">Charity contribution</h2>

      <div className="flex items-center gap-4 mb-6">
        {/* Percentage ring */}
        <div className="shrink-0 relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#e7e5e4" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke="#1a6b4a"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - subscription.charity_percentage / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-serif text-sm font-bold text-brand-600">
            {subscription.charity_percentage}%
          </div>
        </div>

        <div>
          <div className="font-medium text-stone-900 text-sm">{charity?.name ?? 'No charity selected'}</div>
          <div className="text-xs text-stone-400 mt-0.5">{formatCurrency(monthlyContrib)} / month</div>
          <div className="text-xs font-medium text-brand-600 mt-1.5 bg-brand-50 inline-block px-2.5 py-0.5 rounded-full">
            {formatCurrency(totalDonated)} donated total
          </div>
        </div>
      </div>

      {charity && (
        <p className="text-sm text-stone-400 leading-relaxed mb-5 line-clamp-2">
          {charity.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-5 text-center">
        <div className="bg-stone-50 rounded-xl p-3">
          <div className="text-xs text-stone-400 mb-1">Monthly contribution</div>
          <div className="font-serif text-lg font-bold text-stone-800">{formatCurrency(monthlyContrib)}</div>
        </div>
        <div className="bg-stone-50 rounded-xl p-3">
          <div className="text-xs text-stone-400 mb-1">Yearly projection</div>
          <div className="font-serif text-lg font-bold text-stone-800">{formatCurrency(yearlyContrib)}</div>
        </div>
      </div>

      <Link href="/subscribe" className="btn-outline text-sm py-2 w-full text-center block">
        Change charity or percentage
      </Link>
    </div>
  )
}
