import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Above a group of rows, with an optional count. */
export function SectionLabel({
  count,
  className,
  children,
  ...props
}: React.ComponentProps<'h2'> & { count?: number }) {
  return (
    <h2 className={cn('mb-2 flex items-center gap-2 text-sm font-bold', className)} {...props}>
      {children}
      {count !== undefined && <Badge className="tabular-nums">{count}</Badge>}
    </h2>
  )
}
