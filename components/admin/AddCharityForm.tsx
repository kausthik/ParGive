'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AddCharityForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !description.trim()) {
      toast.error('Name and description are required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/charities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, websiteUrl, isFeatured }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success('Charity added')
      setOpen(false)
      setName(''); setDescription(''); setWebsiteUrl(''); setIsFeatured(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add charity')
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Add charity
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="font-serif text-xl font-bold text-stone-900 mb-5">Add charity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Charity name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Greenfields Trust" required />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder="What does this charity do?" required />
          </div>
          <div>
            <label className="label">Website URL</label>
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="input" placeholder="https://example.org" type="url" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-stone-700">Feature on homepage</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">
              {loading ? 'Adding…' : 'Add charity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
