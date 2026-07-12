'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  { q: 'Como funciona a facturação dos SMS?', a: 'Compra créditos antecipadamente através de M-Pesa, e-Mola, cartão, PayPal ou Stripe. Cada SMS enviado consome créditos consoante o tamanho da mensagem e se contém caracteres Unicode.' },
  { q: 'Para que operadoras posso enviar SMS?', a: 'A plataforma entrega para todas as redes móveis de Moçambique: Vodacom, Movitel e Tmcel, com confirmação de entrega em tempo real.' },
  { q: 'Existe um limite de destinatários por envio em massa?', a: 'Pode enviar até 50 000 destinatários por campanha. Para volumes maiores, contacte a nossa equipa para um plano Enterprise dedicado.' },
  { q: 'Como integro a API na minha aplicação?', a: 'Gere uma chave API no seu painel e consulte a documentação Swagger em /docs. Disponibilizamos exemplos para os principais endpoints de envio, contactos e relatórios.' },
  { q: 'Os meus dados estão seguros?', a: 'Sim. Usamos autenticação JWT, hashing bcrypt para credenciais, limitação de taxa (rate limiting), registo de auditoria e autenticação de dois factores opcional.' },
  { q: 'Posso agendar campanhas?', a: 'Sim, pode agendar SMS individuais ou em massa para uma data e hora específicas directamente no painel ou via API.' },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Perguntas frequentes</h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Tudo o que precisa de saber antes de começar.</p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {faqs.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-medium text-slate-900 dark:text-white">{item.q}</span>
              <ChevronDown size={18} className={cn('shrink-0 text-slate-400 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400">{item.a}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
