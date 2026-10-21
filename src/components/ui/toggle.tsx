import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cn } from '@/lib/utils'

/**
 * Icon only, 32px; pressed fills the icon (the Type colour inside TypeScope).
 * Star, pin. `lg`, 40px with a 20px icon: a Recipe's heart.
 */
function Toggle({
  className,
  size = 'default',
  ...props
}: TogglePrimitive.Props & { size?: 'default' | 'lg' }) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-control text-muted-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft disabled:pointer-events-none disabled:opacity-50 data-pressed:text-pressed-foreground data-pressed:[&_svg]:fill-current',
        size === 'lg' ? 'size-10 [&_svg]:size-5' : 'size-8 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export { Toggle }
