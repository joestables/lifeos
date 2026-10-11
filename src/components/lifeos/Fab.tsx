import { PlusIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The phone's floating button (components.md): a page's main action, or
 * Inbox's Capture. A "+" only, named for screen readers by `label`.
 */
export function Fab({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & { label: string }) {
  return (
    <button
      type="button"
      data-slot="fab"
      aria-label={label}
      className={cn(
        'fixed right-5 bottom-[calc(28px+env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-lg bg-primary text-primary-foreground shadow-pop transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring-soft md:hidden [&_svg]:size-5.5',
        className,
      )}
      {...props}
    >
      <PlusIcon aria-hidden />
    </button>
  )
}
