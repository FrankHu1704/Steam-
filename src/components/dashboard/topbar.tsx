'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, LogOut, ChevronDown, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { formatNumber, formatDate } from '@/lib/utils'
import type { Notification } from '@/types/database'

export function Topbar({
  onMenuClick,
  fullName,
  email,
  credits,
}: {
  onMenuClick: () => void
  fullName: string
  email: string
  credits: number
}) {
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/account/notifications')
      .then((r) => r.json())
      .then((res) => setNotifications(res?.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = notifications.filter((n) => !n.is_read).length

  async function markAllRead() {
    await fetch('/api/account/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-surface-dark/90 sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="text-slate-500 lg:hidden">
          <Menu size={22} />
        </button>
        <div className="hidden items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 sm:flex">
          <Wallet size={15} />
          {formatNumber(credits)} créditos
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell size={17} />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notificações</p>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-brand-600 dark:text-brand-400">
                    Marcar tudo como lido
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && <p className="p-4 text-sm text-slate-400">Sem notificações.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className={`border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800 ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''}`}>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDate(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button onClick={() => setUserOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
              {fullName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{fullName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{email}</p>
              </div>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut size={15} /> Terminar sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
