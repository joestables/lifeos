import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import { cn } from '@/lib/utils'

/** Choosing one of a few values in place: a muted track, the chosen one a card pill. */
function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        'inline-flex items-center gap-0.5 self-start rounded-control bg-muted p-[3px]',
        className,
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-[9px] px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft disabled:pointer-events-none disabled:opacity-50 data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-card [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
