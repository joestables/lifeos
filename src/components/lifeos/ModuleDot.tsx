import { cn } from '@/lib/utils'
import type { ModuleKey } from './modules'

/** Keys and filters: an 8px dot, hollow when switched off. */
export function ModuleDot({
  module,
  off = false,
  className,
}: {
  module: ModuleKey
  off?: boolean
  className?: string
}) {
  return (
    <span
      data-module={module}
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        off ? 'shadow-[inset_0_0_0_1.5px_var(--mc)]' : 'bg-mc',
        className,
      )}
    />
  )
}
