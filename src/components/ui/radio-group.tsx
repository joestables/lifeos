import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cn } from '@/lib/utils'

/** Two to four exclusive options in a form; 16px, --primary dot. */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-input-strong outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring-soft disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2 rounded-full bg-primary"
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }

/**
 * Variant `cards` (components.md): an option that needs a line saying what
 * it does. A card-filled row with its title and a muted line; the chosen one
 * has a 1.5px foreground ring and no fill. Inside a RadioGroup.
 */
function RadioCard({
  value,
  title,
  description,
  className,
}: {
  value: string
  title: string
  description: string
  className?: string
}) {
  return (
    <label
      data-slot="radio-card"
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-row bg-card px-3.5 py-3 shadow-card transition-[background-color,box-shadow] has-data-checked:bg-transparent has-data-checked:shadow-none has-data-checked:ring-[1.5px] has-data-checked:ring-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring-soft',
        className,
      )}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

export { RadioCard }
