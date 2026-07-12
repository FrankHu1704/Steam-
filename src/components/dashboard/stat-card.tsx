import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = 'brand',
}: {
  label: string
  value: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  accent?: 'brand' | 'emerald' | 'amber' | 'violet'
}) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', accents[accent])}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {trend.value}
        </p>
      )}
    </Card>
  )
}
