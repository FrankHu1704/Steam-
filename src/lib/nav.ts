import {
  LayoutDashboard,
  Send,
  Users,
  History,
  CreditCard,
  KeyRound,
  UserCircle,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const clientNav: NavItem[] = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/dashboard/send', label: 'Enviar SMS', icon: Send },
  { href: '/dashboard/contacts', label: 'Contactos', icon: Users },
  { href: '/dashboard/history', label: 'Histórico', icon: History },
  { href: '/dashboard/billing', label: 'Faturação', icon: CreditCard },
  { href: '/dashboard/api-keys', label: 'Chaves API', icon: KeyRound },
  { href: '/dashboard/profile', label: 'Perfil', icon: UserCircle },
]

export const adminNav: NavItem[] = [
  { href: '/admin', label: 'Painel admin', icon: ShieldCheck },
]
