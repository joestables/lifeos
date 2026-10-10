import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { cn } from '@/lib/utils'

/** Rare: space separates everything else. */
function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'shrink-0 bg-[color-mix(in_oklch,var(--foreground)_7%,transparent)] data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
