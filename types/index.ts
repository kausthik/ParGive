// ─── Database types ────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'cancelled' | 'lapsed' | 'trialing'
export type SubscriptionPlan = 'monthly' | 'yearly'
export type DrawStatus = 'pending' | 'simulated' | 'published' | 'closed'
export type WinnerStatus = 'pending_verification' | 'approved' | 'rejected' | 'paid'
export type MatchType = 'match_3' | 'match_4' | 'match_5'
export type PaymentStatus = 'pending' | 'paid'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  charity_id: string | null
  charity_percentage: number      // 10–50
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
  charity?: Charity
}

export interface Score {
  id: string
  user_id: string
  value: number                   // 1–45 Stableford
  played_at: string               // date of the round
  created_at: string
}

export interface Draw {
  id: string
  month: string                   // YYYY-MM
  draw_numbers: number[]          // 5 numbers drawn
  draw_type: 'random' | 'algorithmic'
  status: DrawStatus
  jackpot_amount: number
  pool_match_5: number
  pool_match_4: number
  pool_match_3: number
  published_at: string | null
  created_at: string
}

export interface DrawEntry {
  id: string
  draw_id: string
  user_id: string
  scores_snapshot: number[]       // user's 5 scores at time of draw
  match_count: number             // 0–5
  match_type: MatchType | null
  created_at: string
}

export interface Winner {
  id: string
  draw_id: string
  user_id: string
  draw_entry_id: string
  match_type: MatchType
  prize_amount: number
  status: WinnerStatus
  proof_url: string | null
  payment_status: PaymentStatus
  paid_at: string | null
  created_at: string
  profile?: Profile
  draw?: Draw
}

export interface Charity {
  id: string
  name: string
  description: string
  image_url: string | null
  website_url: string | null
  is_featured: boolean
  is_active: boolean
  total_raised: number
  member_count: number
  created_at: string
}

// ─── API response types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface DashboardData {
  profile: Profile
  subscription: Subscription | null
  scores: Score[]
  upcomingDraw: Draw | null
  lastDraw: Draw | null
  lastDrawEntry: DrawEntry | null
  winnings: Winner[]
  totalWon: number
}

export interface AdminStats {
  activeSubscribers: number
  totalSubscribers: number
  monthlyPrizePool: number
  currentJackpot: number
  totalCharityRaised: number
  churnRate: number
}

export interface SubscribePayload {
  planId: 'monthly' | 'yearly'
  charityId: string
  charityPercentage: number
}

export interface AddScorePayload {
  value: number
  playedAt: string
}
