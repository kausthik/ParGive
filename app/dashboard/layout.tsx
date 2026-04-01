import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg font-bold">
            Par<span className="text-brand-500">Give</span>
          </Link>
          <DashboardNav
            userName={profile?.full_name ?? session.user.email ?? ''}
            isAdmin={profile?.is_admin ?? false}
          />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
