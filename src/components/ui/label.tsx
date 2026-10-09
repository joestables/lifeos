import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Above the field, 6px gap (patterns.md#forms). */
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm font-semibold select-none peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
