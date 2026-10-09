import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/lib/utils'

/** 38 × 22px; on fills with --primary. Settings that take effect at once. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full bg-input-strong p-0.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring-soft disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-[18px] rounded-full bg-switch-thumb shadow-thumb transition-transform data-checked:translate-x-4"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
