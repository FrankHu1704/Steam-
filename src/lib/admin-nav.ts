import { LayoutDashboard, Users, Layers, Tag, MessageSquareText, ScrollText, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilizadores', icon: Users },
  { href: '/admin/plans', label: 'Planos', icon: Layers },
  { href: '/admin/promotions', label: 'Promoções', icon: Tag },
  { href: '/admin/sms', label: 'SMS enviados', icon: MessageSquareText },
  { href: '/admin/logs', label: 'Auditoria', icon: ScrollText },
  { href: '/admin/settings', label: 'Configurações', icon: Settings },
]
