import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import type { Charity } from '@/types'

export default async function HomePage() {
  const supabase = createServerClient()

  const { data: charities } = await supabase
    .from('charities')
    .select('*')
    .eq('is_active', true)
    .order('total_raised', { ascending: false })
    .limit(4)

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-stone-50/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-bold">
            Par<span className="text-brand-500">Give</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-outline text-sm py-2 px-4">Sign in</Link>
            <Link href="/subscribe" className="btn-primary text-sm py-2 px-4">Join now</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-600 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          Golf meets giving
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.04] tracking-tight text-stone-900 mb-6 max-w-4xl mx-auto">
          Play your game.<br />
          <em className="text-brand-500 not-italic">Change the world.</em><br />
          Win big doing it.
        </h1>
        <p className="text-lg text-stone-500 max-w-lg mx-auto mb-10 leading-relaxed">
          Log your Stableford scores, enter the monthly prize draw, and send part of every subscription to a charity you believe in.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/subscribe" className="btn-primary text-base px-7 py-3">
            Start playing → from £9.99/mo
          </Link>
          <Link href="/auth/login" className="btn-outline text-base px-7 py-3">
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-20 pt-12 border-t border-stone-200">
          {[
            { num: '£284,600', label: 'Given to charities' },
            { num: '4,820', label: 'Active members' },
            { num: '£42,300', label: "This month's jackpot" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-serif text-3xl font-bold text-stone-900">{s.num}</div>
              <div className="text-sm text-stone-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="section-label mb-3">How it works</div>
          <h2 className="font-serif text-4xl font-bold tracking-tight text-stone-900 mb-12">
            Three things. One platform.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', title: 'Enter your scores', desc: 'Log your last 5 Stableford scores after every round. Simple, fast, no faff.' },
              { n: '02', title: 'Join the monthly draw', desc: 'Your scores automatically enter you into our algorithm-powered monthly prize draw.' },
              { n: '03', title: 'Support a cause', desc: 'Choose a charity. A portion of your subscription goes straight to them every month.' },
              { n: '04', title: 'Win prizes', desc: '3, 4, or 5 number matches unlock prize pools. Jackpot rolls over if unclaimed.' },
            ].map(s => (
              <div key={s.n} className="bg-stone-50 border border-stone-100 rounded-xl p-7">
                <div className="font-serif text-5xl font-bold text-brand-100 leading-none mb-4">{s.n}</div>
                <div className="font-medium text-stone-900 mb-2">{s.title}</div>
                <div className="text-sm text-stone-500 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charities */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="section-label mb-3">Charity partners</div>
        <h2 className="font-serif text-4xl font-bold tracking-tight text-stone-900 mb-12">
          Choose who benefits from your game.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(charities as Charity[] ?? []).map(c => (
            <div key={c.id} className="card hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl mb-4">🌱</div>
              <div className="font-medium text-stone-900 mb-1">{c.name}</div>
              <div className="text-sm text-stone-400 leading-relaxed mb-4 line-clamp-3">{c.description}</div>
              <div className="text-xs font-medium text-brand-600 bg-brand-50 inline-block px-3 py-1 rounded-full">
                £{c.total_raised.toLocaleString()} raised
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900 py-20 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-4xl font-bold text-white mb-4">Ready to tee off?</h2>
          <p className="text-stone-400 mb-8 leading-relaxed">Join 4,820 golfers already playing, giving, and winning.</p>
          <Link href="/subscribe" className="inline-block bg-brand-500 text-white font-medium px-8 py-3.5 rounded-[10px] hover:bg-brand-600 transition-colors">
            Subscribe today →
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-stone-400 border-t border-stone-100">
        © 2026 ParGive · Built by Digital Heroes
      </footer>
    </main>
  )
}
