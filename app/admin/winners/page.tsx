'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatMonth, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

type WinnerRow = {
  id: string
  match_type: string
  prize_amount: number
  status: string
  payment_status: string
  proof_url: string | null
  paid_at: string | null
  created_at: string
  profiles: { full_name: string; email: string } | null
  draws: { month: string } | null
}

const MATCH_LABELS: Record<string, string> = {
  match_3: '3-Match',
  match_4: '4-Match',
  match_5: '5-Match Jackpot',
}

export default function AdminWinnersPage() {
  const [winners, setWinners] = useState<WinnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending_verification' | 'approved' | 'paid'>('all')

  useEffect(() => {
    fetch('/api/admin/winners')
      .then(r => r.json())
      .then(d => { setWinners(d.winners ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function updateWinner(id: string, action: 'approve' | 'reject' | 'mark_paid') {
    setActionLoading(id + action)
    try {
      const res = await fetch(`/api/admin/winners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setWinners(prev => prev.map(w => w.id === id ? { ...w, ...json.winner } : w))
      toast.success(action === 'approve' ? 'Winner approved' : action === 'reject' ? 'Submission rejected' : 'Marked as paid')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    }
    setActionLoading(null)
  }

  const filtered = winners.filter(w => filter === 'all' || w.status === filter)
  const pendingCount = winners.filter(w => w.status === 'pending_verification').length

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">Winners</h1>
      <p className="text-stone-400 text-sm mb-8">Review proof submissions and manage prize payouts.</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          ['all', 'All'],
          ['pending_verification', `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
          ['approved', 'Approved'],
          ['paid', 'Paid'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === val
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-stone-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-stone-400 text-sm">
          No winners matching this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => (
            <div key={w.id} className="card flex items-center gap-4 flex-wrap">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
                {getInitials(w.profiles?.full_name ?? 'U')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900 text-sm truncate">
                  {w.profiles?.full_name ?? 'Unknown'}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {w.profiles?.email} ·{' '}
                  {MATCH_LABELS[w.match_type]} ·{' '}
                  {w.draws?.month ? formatMonth(w.draws.month) : ''}
                </div>
              </div>

              {/* Prize */}
              <div className="text-right shrink-0">
                <div className="font-serif text-lg font-bold text-gold-600">
                  {formatCurrency(w.prize_amount)}
                </div>
              </div>

              {/* Proof */}
              <div className="shrink-0">
                {w.proof_url ? (
                  <a
                    href={w.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-500 underline"
                  >
                    View proof
                  </a>
                ) : (
                  <span className="text-xs text-stone-300">No proof yet</span>
                )}
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {w.status === 'pending_verification' && (
                  <>
                    <button
                      onClick={() => updateWinner(w.id, 'approve')}
                      disabled={actionLoading === w.id + 'approve'}
                      className="btn-primary text-xs py-2 px-3"
                    >
                      {actionLoading === w.id + 'approve' ? '…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateWinner(w.id, 'reject')}
                      disabled={actionLoading === w.id + 'reject'}
                      className="btn-danger text-xs py-2 px-3"
                    >
                      {actionLoading === w.id + 'reject' ? '…' : 'Reject'}
                    </button>
                  </>
                )}

                {w.status === 'approved' && w.payment_status === 'pending' && (
                  <button
                    onClick={() => updateWinner(w.id, 'mark_paid')}
                    disabled={actionLoading === w.id + 'mark_paid'}
                    className="bg-gold-400 text-amber-900 font-medium text-xs py-2 px-3 rounded-[10px] hover:bg-gold-600 transition-colors"
                  >
                    {actionLoading === w.id + 'mark_paid' ? '…' : 'Mark as paid'}
                  </button>
                )}

                {(w.status === 'paid' || w.payment_status === 'paid') && (
                  <span className="text-xs font-medium bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full">
                    ✓ Paid
                  </span>
                )}

                {w.status === 'rejected' && (
                  <span className="text-xs font-medium bg-red-50 text-red-500 px-3 py-1.5 rounded-full">
                    Rejected
                  </span>
                )}

                {w.status === 'approved' && w.payment_status === 'paid' && (
                  <span className="text-xs font-medium bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full">
                    ✓ Paid
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
