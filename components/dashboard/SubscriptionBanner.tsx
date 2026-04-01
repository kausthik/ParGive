import Link from 'next/link'

export default function SubscriptionBanner() {
  return (
    <div className="bg-brand-500 text-white rounded-xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
      <div>
        <p className="font-medium">No active subscription</p>
        <p className="text-sm text-brand-200 mt-0.5">Subscribe to enter scores, join draws, and support your charity.</p>
      </div>
      <Link href="/subscribe" className="bg-white text-brand-600 font-medium text-sm px-5 py-2 rounded-[10px] hover:bg-brand-50 transition-colors shrink-0">
        Subscribe now →
      </Link>
    </div>
  )
}
