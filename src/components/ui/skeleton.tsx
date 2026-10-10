import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Shaped like what's loading; for loads longer than about 300ms. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-[pulse_2s_ease-in-out_infinite] rounded-sm bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
