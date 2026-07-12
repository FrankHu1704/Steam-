import Link from 'next/link'
import { MessageSquareText, Facebook, Linkedin, Twitter } from 'lucide-react'

const columns = [
  {
    title: 'Produto',
    links: [
      { label: 'Funcionalidades', href: '#features' },
      { label: 'Planos', href: '#pricing' },
      { label: 'Documentação da API', href: '/docs' },
      { label: 'Estado do sistema', href: '#' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre nós', href: '#' },
      { label: 'Contactos', href: '#contact' },
      { label: 'Parceiros', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos de serviço', href: '#' },
      { label: 'Política de privacidade', href: '#' },
      { label: 'Conformidade', href: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="container py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
                <MessageSquareText size={18} />
              </span>
              <span className="text-lg">SMSMoz</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              A forma mais rápida e fiável de enviar SMS em massa e transacionais para qualquer número de Moçambique.
            </p>
            <div className="mt-5 flex gap-3">
              {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-white hover:text-brand-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} SMSMoz. Todos os direitos reservados.</p>
          <p>Feito com 💙 em Moçambique</p>
        </div>
      </div>
    </footer>
  )
}
