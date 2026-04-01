import Link from 'next/link'
import { formatCurrency, formatMonth } from '@/lib/utils'
import type { Winner } from '@/types'

interface WinningsProps {
  winnings: (Winner & { draw?: { month: string } })[]
  totalWon: number
}

const MATCH_LABELS: Record<string, string> = {
  match_3: '3-Number Match',
  match_4: '4-Number Match',
  match_5: '5-Number Jackpot',
}

export function WinningsCard({ winnings, totalWon }: WinningsProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-label">Winnings</h2>
        <div className="text-right">
          <div className="text-xs text-stone-400">Total won</div>
          <div className="font-serif text-xl font-bold text-stone-900">{formatCurrency(totalWon)}</div>
        </div>
      </div>

      {winnings.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm">
          No winnings yet — keep playing!
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-stone-50">
          {winnings.slice(0, 6).map(w => (
            <div key={w.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-stone-800">{MATCH_LABELS[w.match_type]}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {w.draw?.month ? formatMonth(w.draw.month) : ''}
                  {w.payment_status === 'paid' && w.paid_at
                    ? ` · Paid ${new Date(w.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-base font-bold text-gold-600">
                  {formatCurrency(w.prize_amount)}
                </div>
                <div className={`text-xs mt-0.5 font-medium px-2 py-0.5 rounded-full inline-block ${
                  w.status === 'paid' || w.payment_status === 'paid'
                    ? 'bg-brand-50 text-brand-600'
                    : w.status === 'approved'
                    ? 'bg-blue-50 text-blue-600'
                    : w.status === 'rejected'
                    ? 'bg-red-50 text-red-500'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {w.status === 'paid' || w.payment_status === 'paid' ? 'Paid'
                    : w.status === 'approved' ? 'Approved'
                    : w.status === 'rejected' ? 'Rejected'
                    : 'Pending verification'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {winnings.some(w => w.status === 'pending_verification') && (
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm text-amber-800 font-medium mb-2">Verification required</p>
          <p className="text-xs text-amber-600 mb-3">
            Upload a screenshot of your score from the golf platform to claim your prize.
          </p>
          <Link href="/dashboard/verify" className="text-xs font-medium text-amber-800 underline">
            Upload proof →
          </Link>
        </div>
      )}
    </div>
  )
}

export default WinningsCard
