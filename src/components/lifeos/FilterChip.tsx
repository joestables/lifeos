import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import type { ReactNode } from 'react'
import type { TypeColour } from './colours'
import { TypeDot } from './TypeDot'

/** The key that also filters (Plan): on is card-filled, off is outlined with a hollow dot. */
export function FilterChip({
  colour,
  pressed,
  onPressedChange,
  children,
}: {
  colour: TypeColour
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: ReactNode
}) {
  return (
    <TogglePrimitive
      pressed={pressed}
      onPressedChange={onPressedChange}
      className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none focus-visible:ring-3 focus-visible:ring-ring-soft data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-card"
    >
      <TypeDot colour={colour} off={!pressed} />
      {children}
    </TogglePrimitive>
  )
}
