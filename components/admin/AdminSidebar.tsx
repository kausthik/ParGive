'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/draw', label: 'Draw Engine', icon: '🎯' },
  { href: '/admin/winners', label: 'Winners', icon: '🏆' },
  { href: '/admin/charities', label: 'Charities', icon: '🌱' },
  { href: '/admin/reports', label: 'Reports', icon: '📈' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-stone-900 min-h-screen shrink-0 flex flex-col">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="font-serif text-lg font-bold text-white">
          Par<span className="text-brand-400">Give</span>
        </div>
        <div className="text-xs text-stone-500 mt-0.5">Admin Console</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(link => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-brand-500/30 text-white font-medium'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
              )}
            >
              <span className="text-base w-5 text-center">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/5">
        <Link href="/dashboard" className="text-xs text-stone-500 hover:text-stone-300 transition-colors">
          ← Back to dashboard
        </Link>
      </div>
    </aside>
  )
}
