import type { Score } from '@/types'

// ─── Random draw ─────────────────────────────────────────────────────────────

/**
 * Standard lottery-style random draw.
 * Picks 5 unique numbers from 1–45.
 */
export function randomDraw(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1)
  const result: number[] = []
  while (result.length < 5) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result.sort((a, b) => a - b)
}

// ─── Algorithmic draw ─────────────────────────────────────────────────────────

/**
 * Weighted draw based on score frequency across all users.
 * More common scores → higher probability of being drawn.
 * This creates more winners overall and drives engagement.
 */
export function algorithmicDraw(allScores: Score[]): number[] {
  // Build frequency map
  const freq = new Map<number, number>()
  for (let i = 1; i <= 45; i++) freq.set(i, 1) // base weight 1

  for (const score of allScores) {
    freq.set(score.value, (freq.get(score.value) ?? 1) + 2)
  }

  // Build weighted pool
  const weightedPool: number[] = []
  for (const [num, weight] of Array.from(freq.entries())) {
    for (let i = 0; i < weight; i++) {
      weightedPool.push(num)
    }
  }

  // Draw 5 unique numbers
  const result: number[] = []
  const used = new Set<number>()
  let attempts = 0

  while (result.length < 5 && attempts < 10000) {
    const idx = Math.floor(Math.random() * weightedPool.length)
    const num = weightedPool[idx]
    if (!used.has(num)) {
      used.add(num)
      result.push(num)
    }
    attempts++
  }

  // Fallback if somehow we don't get 5
  if (result.length < 5) return randomDraw()

  return result.sort((a, b) => a - b)
}

// ─── Match checking ───────────────────────────────────────────────────────────

/**
 * Count how many of a user's scores match the drawn numbers.
 */
export function countMatches(userScores: number[], drawnNumbers: number[]): number {
  const drawnSet = new Set(drawnNumbers)
  return userScores.filter(s => drawnSet.has(s)).length
}

/**
 * Determine match type from match count.
 */
export function getMatchType(matchCount: number): 'match_3' | 'match_4' | 'match_5' | null {
  if (matchCount >= 5) return 'match_5'
  if (matchCount === 4) return 'match_4'
  if (matchCount === 3) return 'match_3'
  return null
}

// ─── Prize calculation ────────────────────────────────────────────────────────

export interface PrizeResult {
  match5Winners: string[]   // user IDs
  match4Winners: string[]
  match3Winners: string[]
  prizePerMatch5: number
  prizePerMatch4: number
  prizePerMatch3: number
}

export function calculatePrizes(
  pool5: number,
  pool4: number,
  pool3: number,
  match5Winners: string[],
  match4Winners: string[],
  match3Winners: string[],
  currentJackpot: number,
  jackpotRollover: number
): PrizeResult {
  const jackpot = currentJackpot + pool5 + jackpotRollover

  return {
    match5Winners,
    match4Winners,
    match3Winners,
    prizePerMatch5: match5Winners.length > 0
      ? +(jackpot / match5Winners.length).toFixed(2)
      : 0,
    prizePerMatch4: match4Winners.length > 0
      ? +(pool4 / match4Winners.length).toFixed(2)
      : 0,
    prizePerMatch3: match3Winners.length > 0
      ? +(pool3 / match3Winners.length).toFixed(2)
      : 0,
  }
}
