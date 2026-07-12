'use client'

import { useState, type FormEvent } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export function Contact() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Mensagem enviada', description: 'A nossa equipa entrará em contacto em breve.', variant: 'success' })
      setForm({ name: '', email: '', company: '', message: '' })
    } catch {
      toast({ title: 'Não foi possível enviar', description: 'Tente novamente mais tarde.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact" className="bg-slate-50 py-24 dark:bg-slate-900/40">
      <div className="container grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Fale connosco</h2>
          <p className="mt-4 max-w-md text-slate-600 dark:text-slate-400">
            Tem dúvidas sobre planos, volumes elevados ou integração da API? A nossa equipa está pronta para ajudar.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Mail size={18} className="text-brand-500" /> suporte@smsmoz.co.mz
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Phone size={18} className="text-brand-500" /> +258 84 000 0000
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <MapPin size={18} className="text-brand-500" /> Maputo, Moçambique
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input className="mt-4" placeholder="Empresa (opcional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Textarea
            required
            className="mt-4"
            placeholder="Como podemos ajudar?"
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <Button type="submit" variant="gradient" className="mt-4 w-full" loading={loading}>
            Enviar mensagem
          </Button>
        </form>
      </div>
    </section>
  )
}
