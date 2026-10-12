import type * as React from 'react'
import { cn } from '@/lib/utils'

/** A state worth noticing on the page (offline). Not for decoration. */
function Alert({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="status"
      data-slot="alert"
      className={cn(
        'grid grid-cols-[auto_1fr] items-start gap-x-3 sm:has-data-[slot=alert-action]:grid-cols-[auto_1fr_auto] gap-y-0.5 rounded-lg bg-card px-4 py-3 shadow-card [&>svg]:row-span-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="alert-title" className={cn('col-start-2 font-bold', className)} {...props} />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('col-start-2 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

/** What to do about it, on the right: one or two small buttons. */
function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        'col-start-2 mt-2 flex items-center gap-1.5 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:self-center',
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertAction, AlertDescription, AlertTitle }
