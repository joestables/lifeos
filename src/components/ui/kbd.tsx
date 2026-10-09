import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Shortcuts in buttons, menus and tooltips. Inside a primary button it takes the button's colour. */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs bg-muted px-1 font-mono text-kbd font-medium text-muted-foreground in-data-[slot=button]:bg-[color-mix(in_oklch,currentColor_16%,transparent)] in-data-[slot=button]:text-current in-data-[slot=tooltip-content]:bg-[color-mix(in_oklch,currentColor_16%,transparent)] in-data-[slot=tooltip-content]:text-current',
        className,
      )}
      {...props}
    />
  )
}

export { Kbd }
