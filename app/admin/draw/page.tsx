'use client'

import { useState } from 'react'
import { formatCurrency, currentMonth } from '@/lib/utils'
import toast from 'react-hot-toast'

function DrawBall({ num }: { num: number }) {
  return (
    <div className="w-12 h-12 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif text-lg font-bold">
      {num}
    </div>
  )
}

export default function DrawEnginePage() {
  const [drawType, setDrawType] = useState<'random' | 'algorithmic'>('random')
  const [month, setMonth] = useState(currentMonth())
  const [simResult, setSimResult] = useState<number[] | null>(null)
  const [publishResult, setPublishResult] = useState<{
    drawNumbers: number[]
    winners: { match5: number; match4: number; match3: number; jackpotRollover: boolean; prizePerMatch5: number; prizePerMatch4: number; prizePerMatch3: number }
  } | null>(null)
  const [loading, setLoading] = useState<'simulate' | 'publish' | null>(null)

  async function runAction(action: 'simulate' | 'publish') {
    setLoading(action)
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, drawType, month }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (action === 'simulate') {
        setSimResult(json.drawNumbers)
        toast.success('Simulation complete')
      } else {
        setPublishResult(json)
        toast.success('Draw published!')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(null)
  }

  const poolTotal = 48200 // Would be fetched from API in production
  const split = { match5: poolTotal * 0.4, match4: poolTotal * 0.35, match3: poolTotal * 0.25 }

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Draw Engine</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="card">
          <h2 className="font-medium text-stone-900 mb-5">Configure draw</h2>

          <div className="mb-5">
            <label className="label">Draw month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="input"
            />
          </div>

          <div className="mb-6">
            <label className="label">Draw logic</label>
            <div className="flex gap-2">
              {(['random', 'algorithmic'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setDrawType(t)}
                  className={`flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all capitalize ${
                    drawType === t
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">
              {drawType === 'random'
                ? 'Standard lottery-style: 5 unique numbers from 1–45 at equal probability.'
                : 'Weighted by score frequency: more common scores have higher draw probability.'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => runAction('simulate')}
              disabled={!!loading}
              className="flex-1 btn-outline"
            >
              {loading === 'simulate' ? 'Simulating…' : 'Run simulation'}
            </button>
            <button
              onClick={() => runAction('publish')}
              disabled={!!loading}
              className="flex-1 btn-primary"
            >
              {loading === 'publish' ? 'Publishing…' : 'Publish draw'}
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-2 text-center">
            Publish creates draw entries for all active subscribers and determines winners.
          </p>
        </div>

        {/* Prize pool */}
        <div className="card">
          <h2 className="font-medium text-stone-900 mb-5">Prize pool breakdown</h2>
          <div className="space-y-3">
            {[
              { label: '5-Match jackpot (40% + rollover)', val: split.match5, accent: true },
              { label: '4-Match pool (35%)', val: split.match4 },
              { label: '3-Match pool (25%)', val: split.match3 },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-3 border-b border-stone-50">
                <span className="text-sm text-stone-500">{r.label}</span>
                <span className={`font-serif text-lg font-bold ${r.accent ? 'text-gold-600' : 'text-stone-800'}`}>
                  {formatCurrency(r.val)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-stone-700">Total pool</span>
              <span className="font-serif text-xl font-bold text-stone-900">{formatCurrency(poolTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation result */}
      {simResult && (
        <div className="card mt-6">
          <h2 className="font-medium text-stone-900 mb-4">Simulation result</h2>
          <div className="flex gap-3 flex-wrap mb-3">
            {simResult.map(n => <DrawBall key={n} num={n} />)}
          </div>
          <p className="text-sm text-stone-400">
            This is a preview only. Click &ldquo;Publish draw&rdquo; to make it official.
          </p>
        </div>
      )}

      {/* Publish result */}
      {publishResult && (
        <div className="card mt-6 border-brand-200">
          <h2 className="font-medium text-brand-700 mb-4">✓ Draw published</h2>
          <div className="flex gap-3 flex-wrap mb-5">
            {publishResult.drawNumbers.map(n => <DrawBall key={n} num={n} />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '5-Match winners', val: publishResult.winners.match5, prize: publishResult.winners.prizePerMatch5 },
              { label: '4-Match winners', val: publishResult.winners.match4, prize: publishResult.winners.prizePerMatch4 },
              { label: '3-Match winners', val: publishResult.winners.match3, prize: publishResult.winners.prizePerMatch3 },
            ].map(r => (
              <div key={r.label} className="bg-stone-50 rounded-xl p-4 text-center">
                <div className="text-xs text-stone-400 mb-1">{r.label}</div>
                <div className="font-serif text-2xl font-bold text-stone-900">{r.val}</div>
                {r.val > 0 && (
                  <div className="text-xs text-brand-600 mt-1">{formatCurrency(r.prize)} each</div>
                )}
              </div>
            ))}
          </div>
          {publishResult.winners.jackpotRollover && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
              No 5-match winner — jackpot rolls over to next month.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
