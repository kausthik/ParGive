# ParGive — Golf Charity Subscription Platform

A full-stack Next.js 14 application combining golf performance tracking, charity fundraising, and a monthly prize draw engine. Built per the Digital Heroes PRD specification.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Stripe (Subscriptions + Webhooks) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Deployment | Vercel |

---

## Project Structure

```
pargive/
├── app/
│   ├── page.tsx                  # Marketing homepage
│   ├── subscribe/page.tsx        # Subscription flow
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts     # Email confirmation
│   ├── dashboard/
│   │   ├── layout.tsx            # Auth-protected layout
│   │   ├── page.tsx              # Main dashboard
│   │   └── verify/page.tsx       # Winner proof upload
│   ├── admin/
│   │   ├── layout.tsx            # Admin-only layout
│   │   ├── page.tsx              # Admin overview
│   │   ├── users/page.tsx
│   │   ├── draw/page.tsx         # Draw engine
│   │   ├── winners/page.tsx      # Verification & payouts
│   │   ├── charities/page.tsx
│   │   └── reports/page.tsx
│   └── api/
│       ├── scores/route.ts       # POST/GET scores
│       ├── scores/[id]/route.ts  # DELETE score
│       ├── subscribe/route.ts    # Create Stripe checkout
│       ├── draws/route.ts        # Simulate/publish draws
│       ├── webhooks/route.ts     # Stripe webhook handler
│       └── admin/
│           ├── winners/route.ts
│           ├── winners/[id]/route.ts
│           └── charities/route.ts
├── components/
│   ├── dashboard/
│   │   ├── ScoreCard.tsx         # ★ Score entry (rolling-5 logic)
│   │   ├── DrawCard.tsx          # Draw status & jackpot
│   │   ├── CharityCard.tsx       # Contribution display
│   │   ├── WinningsCard.tsx      # Winnings history
│   │   ├── DashboardNav.tsx
│   │   └── SubscriptionBanner.tsx
│   └── admin/
│       ├── AdminSidebar.tsx
│       └── AddCharityForm.tsx
├── lib/
│   ├── supabase.ts               # Client/server/route Supabase helpers
│   ├── stripe.ts                 # Stripe instance + price helpers
│   ├── draw-engine.ts            # ★ Random + algorithmic draw logic
│   └── utils.ts                  # Shared utilities
├── hooks/
│   └── useScores.ts              # Score state management hook
├── types/index.ts                # All TypeScript types
├── middleware.ts                 # Auth + admin route protection
└── supabase/migrations/
    ├── 001_initial_schema.sql    # Full DB schema
    └── 002_rpc_helpers.sql       # Supabase RPC functions
```

---

## Setup Guide

### 1. Clone and install

```bash
git clone <your-repo>
cd pargive
npm install
```

### 2. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com) — **use a fresh project, not your personal one**
2. Go to **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`
3. Then run `supabase/migrations/002_rpc_helpers.sql`
4. Go to **Storage** → create a new bucket called `winner-proofs` (set to **private**)
5. Copy your project URL and keys from **Settings → API**

### 3. Stripe setup

1. Create a new Stripe account or use an existing one at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Products** → Add a new product called "ParGive Subscription"
3. Add two prices:
   - **Monthly**: £9.99/month recurring → copy the Price ID (`price_...`)
   - **Yearly**: £89.99/year recurring → copy the Price ID
4. Copy your **Publishable key** and **Secret key** from Developers → API Keys
5. Set up the webhook:
   ```
   stripe listen --forward-to localhost:3000/api/webhooks
   ```
   Or add a webhook endpoint in Stripe Dashboard pointing to `https://yourdomain.com/api/webhooks` with these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

### 4. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Make yourself an admin

After signing up, run this in the Supabase SQL editor:

```sql
update public.profiles
set is_admin = true
where email = 'your@email.com';
```

### 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Deployment to Vercel

1. Push your code to a **new** GitHub repository
2. Go to [vercel.com](https://vercel.com) → Import project → **use a new Vercel account**
3. Set all environment variables in Vercel's project settings (same as `.env.local` but with production values)
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Update your Stripe webhook URL to point to the Vercel domain
6. Deploy

> **Important**: Use `NEXT_PUBLIC_APP_URL` without a trailing slash.

---

## Key Features Implementation

### Rolling 5-score rule
Enforced at **two levels** for robustness:
- **Database trigger** (`enforce_score_limit_trigger`): automatically deletes the oldest score after insert
- **API route** (`/api/scores`): validates score range (1–45) and active subscription before inserting

### Draw engine
Two modes in `lib/draw-engine.ts`:
- **Random**: standard lottery — 5 unique numbers from 1–45 at equal probability
- **Algorithmic**: weighted by score frequency across all users — more common scores have higher draw probability

Publishing a draw:
1. Generates draw numbers
2. Creates `draw_entries` for all active subscribers (snapshot of their scores)
3. Counts matches per user
4. Calculates prizes split equally among winners in each tier
5. Creates `winners` records with `pending_verification` status
6. Handles jackpot rollover if no 5-match winner

### Prize pool split
| Match | Share | Rollover |
|---|---|---|
| 5-Number | 40% | Yes (jackpot) |
| 4-Number | 35% | No |
| 3-Number | 25% | No |

### Subscription lifecycle (Stripe webhooks)
| Event | Action |
|---|---|
| `checkout.session.completed` | Create subscription record, set `active` |
| `invoice.payment_succeeded` | Renew period dates, set `active` |
| `invoice.payment_failed` | Set `lapsed` |
| `customer.subscription.deleted` | Set `cancelled` |
| `customer.subscription.updated` | Sync period dates, update charity if changed |

---

## Testing Checklist

- [ ] User signup & email confirmation
- [ ] Login / logout
- [ ] Subscription flow (monthly and yearly)
- [ ] Score entry — 5-score rolling logic (oldest replaced)
- [ ] Score deletion
- [ ] Draw simulation (random and algorithmic)
- [ ] Draw publish — creates entries, determines winners
- [ ] Jackpot rollover (no 5-match)
- [ ] Charity selection and contribution calculation
- [ ] Winner verification — proof upload
- [ ] Admin: approve / reject winner
- [ ] Admin: mark as paid
- [ ] Admin: add/manage charities
- [ ] User dashboard — all modules functional
- [ ] Admin panel — full control
- [ ] Stripe webhook — subscription activation
- [ ] Responsive design — mobile and desktop
- [ ] Route protection (dashboard, admin)

---

## Score Validation

Scores are validated at every layer:

```
Client (ScoreCard.tsx) → validateScore()
    ↓
API Route (/api/scores) → Zod schema + validateScore() + future date check
    ↓
Database → CHECK constraint (value BETWEEN 1 AND 45)
    ↓
DB Trigger → enforce_score_limit (keeps rolling 5)
```

---

Built by [Digital Heroes](https://digitalheroes.co.in)
