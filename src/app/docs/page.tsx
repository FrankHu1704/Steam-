import type { Metadata } from 'next'
import ApiDocsClient from './api-docs-client'

export const metadata: Metadata = {
  title: 'Documentação da API — SMSMoz',
  description: 'Referência completa da API REST do SMSMoz para envio de SMS em Moçambique.',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-10 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Documentação da API</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Integre o envio de SMS na sua aplicação em minutos. Gere a sua chave API no painel e autentique cada
            pedido com <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm dark:bg-slate-800">Authorization: Bearer &lt;api_key&gt;</code>.
          </p>
        </div>
      </div>
      <ApiDocsClient />
    </div>
  )
}
