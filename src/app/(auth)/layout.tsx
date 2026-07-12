import Link from 'next/link'
import { MessageSquareText, ShieldCheck, Zap, BarChart3 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-grid-slate opacity-20" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 animate-blob rounded-full bg-white/10 blur-3xl" />

        <Link href="/" className="relative z-10 flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <MessageSquareText size={18} />
          </span>
          <span className="text-lg">SMSMoz</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <h1 className="text-3xl font-bold leading-tight">A plataforma de SMS mais rápida de Moçambique</h1>
          <div className="space-y-5">
            {[
              { icon: Zap, text: 'Entrega em segundos para todas as operadoras nacionais' },
              { icon: ShieldCheck, text: 'Infraestrutura segura com autenticação de dois factores' },
              { icon: BarChart3, text: 'Relatórios e estatísticas em tempo real' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <item.icon size={16} />
                </span>
                <p className="text-sm text-white/90">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">© {new Date().getFullYear()} SMSMoz. Todos os direitos reservados.</p>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-6 flex w-full max-w-sm items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <MessageSquareText size={18} />
            </span>
            SMSMoz
          </Link>
          <ThemeToggle />
        </div>
        <div className="hidden w-full max-w-sm justify-end lg:flex">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
