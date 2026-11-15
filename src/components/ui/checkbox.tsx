import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon } from 'lucide-react'
import type { TypeColour } from '@/components/lifeos/colours'
import { cn } from '@/lib/utils'

/**
 * 18px, 6px radius; checked fills with --primary. With a `colour`, the edge
 * (its text value, which shows on a light card) and fill are that Type's: a
 * Task's checkbox is blue everywhere. Its hit area is 34px, 44px by touch. Hovered,
 * an empty box fills with its colour's tint (components.md).
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
        'peer relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-xs border-[1.5px] border-input-strong text-primary-foreground transition-colors outline-none after:absolute after:-inset-2 touch:after:-inset-[13px] focus-visible:ring-3 focus-visible:ring-ring-soft disabled:cursor-not-allowed disabled:opacity-50 not-data-checked:hover:bg-[color-mix(in_oklch,var(--tc,var(--primary))_var(--tile-mix),transparent)] data-checked:border-primary data-checked:bg-primary data-checked:hover:opacity-85',
        colour && 'border-tc-text',
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
