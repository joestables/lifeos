import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Above a group of rows, with an optional count; red for Overdue. */
export function SectionLabel({
  count,
  danger = false,
  className,
  children,
  ...props
}: React.ComponentProps<'h2'> & { count?: number; danger?: boolean }) {
  return (
    <h2
      className={cn(
        'mb-2 flex items-center gap-2 text-sm font-bold',
        danger && 'text-destructive',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <Badge variant={danger ? 'destructive' : 'outline'} className="tabular-nums">
          {count}
        </Badge>
      )}
    </h2>
  )
}
