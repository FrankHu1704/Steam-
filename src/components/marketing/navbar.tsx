'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MessageSquareText, Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

const links = [
  { href: '#features', label: 'Funcionalidades' },
  { href: '#pricing', label: 'Planos' },
  { href: '/docs', label: 'API' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contactos' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800/70 dark:bg-surface-dark/80">
      <nav className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
            <MessageSquareText size={18} />
          </span>
          <span className="text-lg">SMSMoz</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button variant="gradient" size="sm">Criar conta grátis</Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Abrir menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {l.label}
              </a>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <ThemeToggle />
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">Entrar</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="gradient" size="sm" className="w-full">Criar conta</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
