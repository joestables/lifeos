import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/** Keys and filters: an 8px dot in the Type colour, hollow when switched off. */
export function TypeDot({
  colour,
  off = false,
  className,
}: {
  colour: TypeColour
  off?: boolean
  className?: string
}) {
  return (
    <span
      data-colour={colour}
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        off ? 'shadow-[inset_0_0_0_1.5px_var(--tc)]' : 'bg-tc',
        className,
      )}
    />
  )
}
