import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { popupClasses } from './menu-classes'

/** A small form tied to a control (planning a Recipe). */
function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  align = 'center',
  side = 'bottom',
  sideOffset = 6,
  className,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(popupClasses, 'flex w-72 flex-col gap-3 p-3.5', className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn('font-bold', className)}
      {...props}
    />
  )
}

function PopoverFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="popover-footer"
      className={cn('flex justify-end gap-2', className)}
      {...props}
    />
  )
}

export { Popover, PopoverContent, PopoverFooter, PopoverTitle, PopoverTrigger }
