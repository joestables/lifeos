import { ChevronLeftIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Back to where you came from, above a page's title: a chevron and the
 * page's name ("Settings", "Notes").
 */
export function BackLink({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & { label: string }) {
  return (
    <button
      type="button"
      data-slot="back-link"
      className={cn(
        '-ml-1.5 inline-flex h-8 items-center gap-1 self-start rounded-control pr-2 pl-0.5 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon aria-hidden />
      {label}
    </button>
  )
}
