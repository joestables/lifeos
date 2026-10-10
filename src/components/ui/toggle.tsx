import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cn } from '@/lib/utils'

/** Icon only, 32px; pressed fills the icon (Module colour inside ModuleScope). Star, pin. */
function Toggle({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        'inline-grid size-8 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft disabled:pointer-events-none disabled:opacity-50 data-pressed:text-pressed-foreground data-pressed:[&_svg]:fill-current [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export { Toggle }
