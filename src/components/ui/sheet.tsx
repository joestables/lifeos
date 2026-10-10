import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * Attached to its edge and the full height of the screen. Right: an Item's
 * details beside a list. Left: the drawer on a phone (components.md).
 */
function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

const slide = 'duration-(--duration-sheet) ease-(--ease-sheet)'

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  keepMounted = false,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'left' | 'right'
  showCloseButton?: boolean
  /** Stays in the page while closed, so it opens without rendering anything. */
  keepMounted?: boolean
}) {
  return (
    <SheetPrimitive.Portal keepMounted={keepMounted}>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className={cn(
          'fixed inset-0 z-50 bg-overlay transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0',
          slide,
        )}
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed inset-y-0 z-50 flex flex-col gap-5 overflow-y-auto overscroll-contain bg-card p-6 text-card-foreground shadow-dialog outline-none transition-transform',
          slide,
          'data-[side=left]:left-0 data-[side=left]:w-72 data-[side=left]:max-w-[calc(100%-48px)] data-[side=left]:rounded-r-xl data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full',
          'data-[side=right]:right-0 data-[side=right]:w-[calc(100%-48px)] data-[side=right]:max-w-md data-[side=right]:rounded-l-xl data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                aria-label="Close"
              />
            }
          >
            <XIcon />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1 pr-8', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex justify-end gap-2', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title data-slot="sheet-title" className={cn('text-h2', className)} {...props} />
  )
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
