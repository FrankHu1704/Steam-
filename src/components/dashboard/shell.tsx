'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function DashboardShell({
  isAdmin,
  fullName,
  email,
  credits,
  children,
}: {
  isAdmin: boolean
  fullName: string
  email: string
  credits: number
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-surface-dark">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">
        <Sidebar isAdmin={isAdmin} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-950">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-slate-500">
              <X size={20} />
            </button>
            <Sidebar isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} fullName={fullName} email={email} credits={credits} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
