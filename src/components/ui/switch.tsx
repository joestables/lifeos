import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/lib/utils'

/**
 * 38 × 22px; on fills with --primary, its thumb --primary-foreground, so the
 * two never match (dark mode's ink is near white). By touch its hit area is
 * 44px high. Settings that take effect at once.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full bg-input-strong p-0.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring-soft disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary touch:after:absolute touch:after:-inset-x-1 touch:after:-inset-y-[11px]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-[18px] rounded-full bg-switch-thumb shadow-thumb transition-[translate,background-color] data-checked:translate-x-4 data-checked:bg-primary-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
