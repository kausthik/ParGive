'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, scoreToBarWidth, validateScore } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Score } from '@/types'

interface Props {
  scores: Score[]
  hasSubscription: boolean
}

export default function ScoreCard({ scores: initialScores, hasSubscription }: Props) {
  const [scores, setScores] = useState<Score[]>(initialScores)
  const [inputValue, setInputValue] = useState('')
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function addScore() {
    const val = parseInt(inputValue, 10)
    const err = validateScore(val)
    if (err) { toast.error(err); return }
    if (!playedAt) { toast.error('Please select a date'); return }

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val, playedAt }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Optimistically update UI — insert at top, drop oldest beyond 5
      const newScore: Score = {
        id: json.id,
        user_id: '',
        value: val,
        played_at: playedAt,
        created_at: new Date().toISOString(),
      }
      setScores(prev => [newScore, ...prev].slice(0, 5))
      setInputValue('')
      toast.success('Score added')
      startTransition(() => router.refresh())
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add score')
    }
  }

  async function deleteScore(id: string) {
    try {
      const res = await fetch(`/api/scores/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setScores(prev => prev.filter(s => s.id !== id))
      toast.success('Score removed')
      startTransition(() => router.refresh())
    } catch {
      toast.error('Failed to remove score')
    }
  }

  const maxScore = Math.max(...scores.map(s => s.value), 1)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-label">My scores</h2>
        <span className="text-xs text-stone-400">{scores.length} / 5 logged</span>
      </div>

      {/* Score list */}
      {scores.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm">
          No scores yet — add your first round below
        </div>
      ) : (
        <div className="space-y-2.5 mb-5">
          {scores.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3 group">
              {/* Score number */}
              <div className="font-serif text-2xl font-bold text-brand-500 w-10 shrink-0">
                {s.value}
              </div>

              {/* Date */}
              <div className="text-xs text-stone-400 w-24 shrink-0">{formatDate(s.played_at)}</div>

              {/* Bar */}
              <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-400 rounded-full transition-all duration-500"
                  style={{ width: scoreToBarWidth(s.value) }}
                />
              </div>

              {/* Latest badge */}
              {i === 0 && (
                <span className="text-xs font-medium text-gold-600 bg-gold-100 px-2 py-0.5 rounded-full shrink-0">
                  Latest
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteScore(s.id)}
                className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all ml-1 shrink-0"
                title="Remove score"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Average */}
      {scores.length > 0 && (
        <div className="flex justify-between text-xs text-stone-400 mb-5 px-1">
          <span>Average: <strong className="text-stone-600">{(scores.reduce((s, x) => s + x.value, 0) / scores.length).toFixed(1)}</strong></span>
          <span>Best: <strong className="text-stone-600">{Math.max(...scores.map(s => s.value))}</strong></span>
          <span>Worst: <strong className="text-stone-600">{Math.min(...scores.map(s => s.value))}</strong></span>
        </div>
      )}

      {/* Add score form */}
      {hasSubscription ? (
        <div>
          <p className="text-xs text-stone-400 mb-2">Add score (1–45 Stableford) — replaces oldest when you have 5</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addScore()}
              placeholder="Score..."
              min={1}
              max={45}
              className="input w-24 text-center"
            />
            <input
              type="date"
              value={playedAt}
              onChange={e => setPlayedAt(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="input flex-1"
            />
            <button
              onClick={addScore}
              disabled={isPending || !inputValue}
              className="btn-primary px-4 py-2.5 text-sm shrink-0"
            >
              {isPending ? '…' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center bg-stone-50 rounded-xl p-4">
          <p className="text-sm text-stone-500 mb-3">Subscribe to start logging scores</p>
          <a href="/subscribe" className="btn-primary text-sm py-2 px-5 inline-block">Subscribe now</a>
        </div>
      )}
    </div>
  )
}
