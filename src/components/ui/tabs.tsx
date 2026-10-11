import type * as React from 'react'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

/**
 * Pills with no track: selected is --accent; inside TypeScope, the Type's
 * tint with its text colour (components.md).
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-5', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 self-start overflow-x-auto [scrollbar-width:none]',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft disabled:pointer-events-none disabled:opacity-50 data-active:bg-selected data-active:text-selected-foreground',
        className,
      )}
      {...props}
    />
  )
}

/** The optional count in a tab. */
function TabsCount({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('text-xs tabular-nums opacity-70', className)} {...props} />
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn('outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger }
