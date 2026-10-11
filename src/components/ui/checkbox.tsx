import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon } from 'lucide-react'
import type { TypeColour } from '@/components/lifeos/colours'
import { cn } from '@/lib/utils'

/**
 * 18px, 6px radius; checked fills with --primary. With a `colour`, the edge
 * and fill are that Type's: a Task's checkbox is blue everywhere (components.md).
 */
function Checkbox({
  className,
  colour,
  ...props
}: CheckboxPrimitive.Root.Props & { colour?: Exclude<TypeColour, 'none'> }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-colour={colour}
      className={cn(
        'peer relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-xs border-[1.5px] border-input-strong text-primary-foreground transition-colors outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring-soft disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary',
        colour && 'border-tc',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center"
      >
        <CheckIcon className="size-3 stroke-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
