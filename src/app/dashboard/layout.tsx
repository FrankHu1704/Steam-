import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/shell'
import { AlertTriangle } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <DashboardShell isAdmin={profile.role === 'admin'} fullName={profile.full_name || 'Utilizador'} email={user?.email ?? ''} credits={profile.credits}>
      {profile.status === 'pending' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle size={18} className="shrink-0" />
          A sua conta está pendente de aprovação. Algumas funcionalidades podem estar limitadas até a aprovação do administrador.
        </div>
      )}
      {children}
    </DashboardShell>
  )
}
