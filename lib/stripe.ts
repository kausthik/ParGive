import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const PLAN_PRICES: Record<string, string> = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.STRIPE_YEARLY_PRICE_ID!,
}

export const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 9.99,
  yearly: 89.99,
}

// Calculate prize pool contribution from a subscription amount
export function calcPrizePool(amount: number, charityPct: number) {
  const charityAmount = +(amount * (charityPct / 100)).toFixed(2)
  const prizePool = +(amount - charityAmount).toFixed(2)
  return { charityAmount, prizePool }
}

// Prize pool split logic per PRD
export function calcPoolSplit(totalPool: number) {
  return {
    match5: +(totalPool * 0.4).toFixed(2),
    match4: +(totalPool * 0.35).toFixed(2),
    match3: +(totalPool * 0.25).toFixed(2),
  }
}
