'use client'

import { useEffect, useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import Papa from 'papaparse'
import { Plus, Search, Trash2, Upload, FolderPlus, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import type { Contact, ContactList } from '@/types/database'

export default function ContactsPage() {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [lists, setLists] = useState<(ContactList & { contacts?: { count: number }[] })[]>([])
  const [search, setSearch] = useState('')
  const [listFilter, setListFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddList, setShowAddList] = useState(false)

  async function loadContacts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (listFilter) params.set('list_id', listFilter)
    const res = await fetch(`/api/account/contacts?${params.toString()}`)
    const json = await res.json()
    setContacts(json?.data ?? [])
    setLoading(false)
  }

  async function loadLists() {
    const res = await fetch('/api/account/contact-lists')
    const json = await res.json()
    setLists(json?.data ?? [])
  }

  useEffect(() => {
    loadLists()
  }, [])

  useEffect(() => {
    const t = setTimeout(loadContacts, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, listFilter])

  async function deleteContact(id: string) {
    await fetch(`/api/account/contacts/${id}`, { method: 'DELETE' })
    setContacts((prev) => prev.filter((c) => c.id !== id))
    toast({ title: 'Contacto eliminado', variant: 'success' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contactos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Organize os seus destinatários em listas e etiquetas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddList(true)}>
            <FolderPlus size={16} /> Nova lista
          </Button>
          <Button variant="gradient" onClick={() => setShowAddContact(true)}>
            <Plus size={16} /> Novo contacto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-3">
            <button
              onClick={() => setListFilter('')}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${!listFilter ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Todos os contactos
            </button>
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setListFilter(l.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium ${listFilter === l.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <span className="truncate">{l.name}</span>
                <span className="text-xs text-slate-400">{l.contacts?.[0]?.count ?? 0}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Pesquisar por nome ou número..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Número</th>
                    <th className="pb-2 font-medium">Etiquetas</th>
                    <th className="pb-2 font-medium">Adicionado</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {!loading && contacts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum contacto encontrado.
                      </td>
                    </tr>
                  )}
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">{c.name || '—'}</td>
                      <td className="py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">{c.phone}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.tags?.map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(c.created_at)}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => deleteContact(c.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddContact && (
        <AddContactModal
          lists={lists}
          onClose={() => setShowAddContact(false)}
          onCreated={() => {
            setShowAddContact(false)
            loadContacts()
            loadLists()
          }}
        />
      )}

      {showAddList && (
        <AddListModal
          onClose={() => setShowAddList(false)}
          onCreated={() => {
            setShowAddList(false)
            loadLists()
          }}
        />
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AddContactModal({ lists, onClose, onCreated }: { lists: ContactList[]; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [listId, setListId] = useState('')
  const [loading, setLoading] = useState(false)
  const [csvName, setCsvName] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/account/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, list_id: listId || null }),
    })
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao criar contacto', variant: 'error' })
      return
    }
    toast({ title: 'Contacto criado', variant: 'success' })
    onCreated()
  }

  function handleCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
          .map((row) => ({
            phone: row.phone || row.telefone || row.numero || Object.values(row)[0],
            name: row.name || row.nome,
            list_id: listId || undefined,
          }))
          .filter((r) => r.phone)

        setLoading(true)
        const res = await fetch('/api/account/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: rows }),
        })
        setLoading(false)
        const json = await res.json()
        if (!res.ok) {
          toast({ title: 'Erro ao importar', variant: 'error' })
          return
        }
        toast({ title: 'Importação concluída', description: `${json.imported} contactos importados.`, variant: 'success' })
        onCreated()
      },
    })
  }

  return (
    <Modal title="Novo contacto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <Input required placeholder="+258 84 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select value={listId} onChange={(e) => setListId(e.target.value)}>
          <option value="">Sem lista</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Adicionar contacto
        </Button>
      </form>

      <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /> ou <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-brand-400 dark:border-slate-700 dark:text-slate-400">
        <Upload size={20} />
        {csvName || 'Importar contactos via CSV'}
        <input type="file" accept=".csv" className="hidden" onChange={handleCsv} />
      </label>
    </Modal>
  )
}

function AddListModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/account/contact-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao criar lista', variant: 'error' })
      return
    }
    toast({ title: 'Lista criada', variant: 'success' })
    onCreated()
  }

  return (
    <Modal title="Nova lista de contactos" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input required placeholder="Nome da lista" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Criar lista
        </Button>
      </form>
    </Modal>
  )
}
