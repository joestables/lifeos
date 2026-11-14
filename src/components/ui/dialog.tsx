import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/** Capture, and focused tasks that need the whole attention. */
function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/** Behind dialogs and sheets. */
const overlayClasses =
  'fixed inset-0 z-50 bg-overlay data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(overlayClasses, className)}
      {...props}
    />
  )
}

/**
 * Opened, the popup itself takes focus, never its first field, so an Edit
 * dialog doesn't raise the keyboard on a phone (Joe, 26 October); a New
 * one's first field opts in with `autoFocus`.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  initialFocus,
  list = false,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  /** A long list (Add exercise, Strength history, Filters): no taller than 70% of a phone's screen, scrolling inside. */
  list?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        initialFocus={
          initialFocus ??
          (() => {
            // The Dialog just opened is the last; a field asking for focus
            // (a New dialog's name) has it, else the Dialog itself.
            const popup = [
              ...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]'),
            ].at(-1)
            return popup?.querySelector<HTMLElement>('[data-autofocus]') ?? popup ?? false
          })
        }
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-36px-2*max(env(safe-area-inset-top),env(safe-area-inset-bottom)))] w-[calc(100%-36px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto overscroll-contain rounded-xl bg-popover p-6 text-popover-foreground shadow-dialog outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          // A Dialog opened from this one dims it, as the page is dimmed.
          'after:pointer-events-none after:absolute after:inset-0 after:z-50 after:rounded-[inherit] after:bg-overlay after:opacity-0 after:transition-opacity data-nested-dialog-open:after:opacity-100',
          list && 'max-sm:max-h-[70svh]',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
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
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1 pr-8', className)}
      {...props}
    />
  )
}

/** The primary action last on the right; full width and stacked on a phone. */
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-wrap items-center justify-end gap-2', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-h2', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  overlayClasses,
}
