'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck, ArrowLeftCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminNavItems } from '@/lib/admin-nav'

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2 px-6 py-5 font-bold text-slate-900 dark:text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <ShieldCheck size={18} />
        </span>
        Admin
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {adminNavItems.map((item) => {
          const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
        >
          <ArrowLeftCircle size={18} /> Área do cliente
        </Link>
      </div>
    </div>
  )
}
