import type * as React from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A 40px line to choose in a Popover's list (components.md): a small
 * leading tile, the name (weight 600), then what to say about it, muted.
 */
export function PickRow({
  leading,
  title,
  meta,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'title'> & {
  leading?: ReactNode
  title: ReactNode
  meta?: ReactNode
}) {
  return (
    <button
      type="button"
      data-slot="pick-row"
      className={cn(
        'flex h-10 w-full min-w-0 items-center gap-2.5 rounded-sm px-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent',
        className,
      )}
      {...props}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
      {meta && <span className="shrink-0 truncate text-xs text-muted-foreground">{meta}</span>}
    </button>
  )
}
