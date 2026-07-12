import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AdminShell fullName={profile.full_name || 'Admin'} email={user?.email ?? ''} credits={profile.credits}>
      {children}
    </AdminShell>
  )
}
