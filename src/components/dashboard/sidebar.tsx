'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clientNav, adminNav } from '@/lib/nav'

export function Sidebar({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 px-6 py-5 font-bold text-slate-900 dark:text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
          <MessageSquareText size={18} />
        </span>
        SMSMoz
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {clientNav.map((item) => {
          const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
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

        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-200 dark:border-slate-800" />
            {adminNav.map((item) => {
              const active = pathname.startsWith(item.href)
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
          </>
        )}
      </nav>
    </div>
  )
}
