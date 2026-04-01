'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Charity } from '@/types'

const PLANS = {
  monthly: { label: 'Monthly', price: 9.99, period: 'month', badge: null },
  yearly:  { label: 'Yearly',  price: 89.99, period: 'year', badge: 'Best value — save 25%' },
}

export default function SubscribePage() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [charities, setCharities] = useState<Charity[]>([])
  const [selectedCharity, setSelectedCharity] = useState<string>('')
  const [charityPct, setCharityPct] = useState(15)
  const [loading, setLoading] = useState(false)
  const [fetchingCharities, setFetchingCharities] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('charities').select('*').eq('is_active', true).order('total_raised', { ascending: false })
      .then(({ data }) => {
        setCharities(data ?? [])
        if (data?.[0]) setSelectedCharity(data[0].id)
        setFetchingCharities(false)
      })
  }, [])

  const base = PLANS[plan].price
  const charityAmount = +(base * charityPct / 100).toFixed(2)
  const prizePool = +(base - charityAmount).toFixed(2)

  async function handleSubscribe() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please create an account first')
      router.push('/auth/signup')
      return
    }
    if (!selectedCharity) {
      toast.error('Please select a charity')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan, charityId: selectedCharity, charityPercentage: charityPct }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      // Redirect to Stripe checkout
      window.location.href = json.checkoutUrl
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-100 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold">Par<span className="text-brand-500">Give</span></Link>
          <Link href="/auth/login" className="text-sm text-stone-400 hover:text-stone-700">Sign in</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="section-label mb-2">Get started</div>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900">Choose your plan</h1>
        </div>

       
        <div className="grid grid-cols-2 gap-4 mb-6">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPlan(key)}
              className={`relative text-left border-2 rounded-xl p-6 transition-all duration-200 ${
                plan === key ? 'border-brand-500 bg-brand-50/30' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-400 text-amber-900 text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  {p.badge}
                </div>
              )}
              <div className="font-serif text-lg font-bold text-stone-900 mb-1">{p.label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light text-stone-900">{formatCurrency(p.price)}</span>
                <span className="text-sm text-stone-400">/ {p.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {key === 'monthly' ? (
                  <>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Full score entry access</li>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Monthly prize draw</li>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Charity contribution</li>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Cancel anytime</li>
                  </>
                ) : (
                  <>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Everything in monthly</li>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Priority draw weighting</li>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Exclusive charity events</li>
                    <li className="text-sm text-stone-500 flex gap-2"><span className="text-brand-500">✓</span> Early result access</li>
                  </>
                )}
              </ul>
            </button>
          ))}
        </div>

      
        <div className="card mb-4">
          <h2 className="font-medium text-stone-900 mb-4">Choose your charity</h2>
          {fetchingCharities ? (
            <div className="text-sm text-stone-400">Loading charities…</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {charities.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCharity(c.id)}
                  className={`text-left border-2 rounded-xl p-3 text-sm transition-all ${
                    selectedCharity === c.id
                      ? 'border-brand-500 bg-brand-50/40 text-brand-700 font-medium'
                      : 'border-stone-100 bg-stone-50 text-stone-600 hover:border-stone-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Charity percentage */}
        <div className="card mb-4">
          <h2 className="font-medium text-stone-900 mb-1">Charity contribution</h2>
          <p className="text-sm text-stone-400 mb-4">Minimum 10% of your subscription goes to your chosen charity.</p>
          <div className="text-center text-3xl font-light text-brand-600 mb-3">{charityPct}%</div>
          <input
            type="range"
            min={10} max={50} step={5}
            value={charityPct}
            onChange={e => setCharityPct(Number(e.target.value))}
            className="w-full accent-brand-500 mb-2"
          />
          <div className="flex justify-between text-xs text-stone-400">
            <span>10% minimum</span>
            <span>50% maximum</span>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-stone-900 text-white rounded-xl p-6 mb-5">
          {[
            ['Plan', `${PLANS[plan].label} — ${formatCurrency(PLANS[plan].price)}`],
            ['Charity contribution', `${charityPct}% → ${formatCurrency(charityAmount)} / ${PLANS[plan].period}`],
            ['Prize pool contribution', `${formatCurrency(prizePool)} / ${PLANS[plan].period}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-2 border-b border-white/10">
              <span className="text-white/60">{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="flex justify-between font-medium pt-3">
            <span>Total due today</span>
            <span>{formatCurrency(base)}</span>
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading || !selectedCharity}
          className="btn-primary w-full text-base py-3"
        >
          {loading ? 'Redirecting to payment…' : 'Proceed to payment →'}
        </button>

        <p className="text-center text-xs text-stone-400 mt-4">
          Payments powered by Stripe · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  )
}
