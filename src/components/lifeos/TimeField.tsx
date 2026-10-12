import type * as React from 'react'
import { fieldClasses } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** A time: the browser's own field, 24-hour, styled as an Input (components.md). */
export function TimeField({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="time"
      data-slot="time-field"
      className={cn(
        fieldClasses,
        'h-10 px-3.5 [color-scheme:light] dark:[color-scheme:dark]',
        className,
      )}
      {...props}
    />
  )
}
