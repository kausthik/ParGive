'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatMonth } from '@/lib/utils'
import toast from 'react-hot-toast'

type PendingWinner = {
  id: string
  match_type: string
  prize_amount: number
  status: string
  draws: { month: string }
}

const MATCH_LABELS: Record<string, string> = {
  match_3: '3-Number Match',
  match_4: '4-Number Match',
  match_5: '5-Number Jackpot',
}

export default function VerifyPage() {
  const [winners, setWinners] = useState<PendingWinner[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('winners')
        .select('*, draws:draw_id(month)')
        .eq('user_id', user.id)
        .eq('status', 'pending_verification')
      setWinners((data ?? []) as PendingWinner[])
    }
    load()
  }, [])

  async function uploadProof(winnerId: string, file: File) {
    setUploading(winnerId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload to Supabase Storage
      const path = `${user.id}/${winnerId}/${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('winner-proofs')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('winner-proofs')
        .getPublicUrl(path)

      // Save URL to winner record
      const { error: updateError } = await supabase
        .from('winners')
        .update({ proof_url: publicUrl })
        .eq('id', winnerId)

      if (updateError) throw updateError

      toast.success('Proof uploaded — admin will review shortly')
      setWinners(prev => prev.filter(w => w.id !== winnerId))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(null)
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-2xl font-bold text-stone-900 mb-2">Claim your prize</h1>
      <p className="text-stone-400 text-sm mb-8">
        Upload a screenshot of your golf scores from the platform to verify your win and unlock payment.
      </p>

      {winners.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-3xl mb-3">🏆</div>
          <p className="text-stone-400 text-sm">No prizes awaiting verification</p>
        </div>
      ) : (
        <div className="space-y-4">
          {winners.map(w => (
            <div key={w.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-medium text-stone-900">{MATCH_LABELS[w.match_type]}</div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {formatMonth(w.draws.month)}
                  </div>
                </div>
                <div className="font-serif text-xl font-bold text-gold-600">
                  {formatCurrency(w.prize_amount)}
                </div>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-stone-600 mb-1 font-medium">What to upload</p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Take a screenshot of your score history from the golf platform you use (e.g. Handicap Index app, club scoring system, or similar). The screenshot must clearly show the scores matching the draw numbers.
                </p>
              </div>

              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                  <div className="text-2xl mb-2">📎</div>
                  <p className="text-sm text-stone-500">
                    {uploading === w.id ? 'Uploading…' : 'Click to select screenshot (PNG, JPG, PDF)'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploading === w.id}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) uploadProof(w.id, file)
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
