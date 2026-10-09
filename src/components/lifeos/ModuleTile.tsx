import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModuleKey } from './modules'

/** The first thing in a row that shows an Item: its Type's icon on its Module's tint. */
export function ModuleTile({
  module,
  icon: Icon,
  size = 'default',
  className,
}: {
  module: ModuleKey
  icon: LucideIcon
  size?: 'default' | 'sm'
  className?: string
}) {
  return (
    <span
      data-module={module}
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center text-mc',
        module === 'core'
          ? 'bg-muted'
          : 'bg-[color-mix(in_oklch,var(--mc)_var(--tile-mix),transparent)]',
        size === 'sm' ? 'size-6 rounded-sm [&_svg]:size-3.5' : 'size-8 rounded-md [&_svg]:size-4',
        className,
      )}
    >
      <Icon />
    </span>
  )
}
