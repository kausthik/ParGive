import { formatCurrency, formatMonth } from '@/lib/utils'
import type { Draw } from '@/types'

interface Props {
  upcomingDraw: Draw | null
  lastDraw: (Draw & { draw_entries: { match_count: number; scores_snapshot: number[] }[] }) | null
  userScores: number[]
}

function DrawBall({ num, drawn }: { num: number; drawn?: boolean }) {
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm font-bold transition-all ${
      drawn
        ? 'bg-brand-500 text-white ring-2 ring-brand-200'
        : 'bg-stone-100 text-stone-500'
    }`}>
      {num}
    </div>
  )
}

function UserScorePill({ score, isMatch }: { score: number; isMatch: boolean }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isMatch ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-500'
    }`}>
      {score}
    </span>
  )
}

export default function DrawCard({ upcomingDraw, lastDraw, userScores }: Props) {
  const now = new Date()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeft = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const lastEntry = lastDraw?.draw_entries?.[0]
  const matchCount = lastEntry?.match_count ?? 0
  const drawnNumbers = lastDraw?.draw_numbers ?? []
  const drawnSet = new Set(drawnNumbers)

  const jackpot = upcomingDraw?.jackpot_amount ?? 0
  const pool5 = upcomingDraw?.pool_match_5 ?? 0
  const pool4 = upcomingDraw?.pool_match_4 ?? 0
  const pool3 = upcomingDraw?.pool_match_3 ?? 0

  function matchLabel(count: number) {
    if (count >= 5) return { text: '🎉 5-match — JACKPOT!', color: 'text-brand-600' }
    if (count === 4) return { text: '🏆 4-match — major prize!', color: 'text-brand-500' }
    if (count === 3) return { text: '✓ 3-match — prize winner!', color: 'text-brand-400' }
    return { text: `${count} match${count !== 1 ? 'es' : ''} — no prize tier reached`, color: 'text-stone-400' }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-label">Monthly draw</h2>
        <span className="text-xs text-stone-400">{daysLeft} days until draw</span>
      </div>

      {/* Jackpot */}
      <div className="bg-stone-50 rounded-xl p-4 mb-5">
        <div className="text-xs text-stone-400 mb-1">Current jackpot (5-match)</div>
        <div className="font-serif text-3xl font-bold text-gold-600">
          {formatCurrency(jackpot + pool5)}
        </div>
        {jackpot > 0 && (
          <div className="text-xs text-stone-400 mt-1">Includes {formatCurrency(jackpot)} rolled over from last month</div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center">
            <div className="text-xs text-stone-400">4-match pool</div>
            <div className="text-sm font-medium text-stone-700">{formatCurrency(pool4)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-stone-400">3-match pool</div>
            <div className="text-sm font-medium text-stone-700">{formatCurrency(pool3)}</div>
          </div>
        </div>
      </div>

      {/* Your scores in this draw */}
      {userScores.length > 0 && (
        <div className="mb-5">
          <div className="text-xs text-stone-400 mb-2">Your entered scores</div>
          <div className="flex gap-1.5 flex-wrap">
            {userScores.map((s, i) => (
              <UserScorePill key={i} score={s} isMatch={false} />
            ))}
          </div>
        </div>
      )}

      {/* Last draw result */}
      {lastDraw && drawnNumbers.length > 0 && (
        <div>
          <div className="text-xs text-stone-400 mb-2">Last draw — {formatMonth(lastDraw.month)}</div>
          <div className="flex gap-2 flex-wrap mb-3">
            {drawnNumbers.map((n, i) => (
              <DrawBall key={i} num={n} drawn={drawnSet.has(n) && userScores.includes(n)} />
            ))}
          </div>
          <div className={`text-xs font-medium ${matchLabel(matchCount).color}`}>
            {matchLabel(matchCount).text}
          </div>
        </div>
      )}

      {!lastDraw && (
        <div className="text-center text-sm text-stone-400 py-4">
          No draws published yet — first draw coming soon!
        </div>
      )}
    </div>
  )
}
