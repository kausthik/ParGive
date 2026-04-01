import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-stone-100 px-8 h-14 flex items-center justify-between">
          <span className="text-sm text-stone-400">Admin panel — ParGive</span>
          <span className="text-sm font-medium text-stone-700">{profile.full_name}</span>
        </header>
        <main className="p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}
