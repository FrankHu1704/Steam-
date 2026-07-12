import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Cta() {
  return (
    <section className="container py-24">
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-8 py-16 text-center sm:px-16">
        <div className="pointer-events-none absolute inset-0 bg-grid-slate opacity-20 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Pronto para começar a enviar SMS?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/90">
          Crie a sua conta gratuita em menos de dois minutos e receba créditos de teste para experimentar a plataforma.
        </p>
        <Link href="/register" className="mt-8 inline-block">
          <Button variant="secondary" size="lg">
            Criar conta grátis <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </section>
  )
}
