import { useState, useCallback } from 'react'
import type { Score } from '@/types'

export function useScores(initial: Score[]) {
  const [scores, setScores] = useState<Score[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addScore = useCallback(async (value: number, playedAt: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, playedAt }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Optimistic update: prepend and keep only 5
      const newScore: Score = {
        id: json.id,
        user_id: '',
        value,
        played_at: playedAt,
        created_at: new Date().toISOString(),
      }
      setScores(prev => [newScore, ...prev].slice(0, 5))
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add score')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const removeScore = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    // Optimistic remove
    setScores(prev => prev.filter(s => s.id !== id))

    try {
      const res = await fetch(`/api/scores/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Revert on failure
        throw new Error('Failed to delete')
      }
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove score')
      // Could re-fetch to restore state
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const stats = {
    average: scores.length > 0
      ? +(scores.reduce((s, x) => s + x.value, 0) / scores.length).toFixed(1)
      : 0,
    best: scores.length > 0 ? Math.max(...scores.map(s => s.value)) : 0,
    worst: scores.length > 0 ? Math.min(...scores.map(s => s.value)) : 0,
    count: scores.length,
    isFull: scores.length >= 5,
  }

  return { scores, addScore, removeScore, loading, error, stats }
}
