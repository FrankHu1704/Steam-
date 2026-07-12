import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

/** Returns the current authenticated user's profile, or null if unauthenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return (profile as Profile) ?? null
}

/** For use in Server Components/pages under /dashboard — redirects to /login if unauthenticated. */
export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.status === 'blocked') redirect('/login?error=blocked')
  return profile
}

/** For use in Server Components/pages under /admin — redirects non-admins away. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser()
  if (profile.role !== 'admin') redirect('/dashboard')
  return profile
}
