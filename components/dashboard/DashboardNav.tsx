'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  userName: string
  isAdmin: boolean
}

export default function DashboardNav({ userName, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      {isAdmin && (
        <Link href="/admin" className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">
          Admin panel
        </Link>
      )}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-900 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-medium">
            {getInitials(userName)}
          </div>
          <span className="hidden sm:block">{userName.split(' ')[0]}</span>
          <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-10 bg-white border border-stone-100 rounded-xl shadow-lg w-44 py-1 z-50">
            <Link href="/dashboard" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}>Dashboard</Link>
            <Link href="/subscribe" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}>Manage plan</Link>
            <hr className="my-1 border-stone-100" />
            <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
