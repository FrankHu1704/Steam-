import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'

const variants: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
  outline: 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
}

export function Badge({ className, variant = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}
