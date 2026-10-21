import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

function Pill({
  pressed,
  onPressedChange,
  children,
  label,
}: {
  pressed: boolean
  onPressedChange?: (on: boolean) => void
  children: ReactNode
  label: string
}) {
  return (
    <TogglePrimitive
      aria-label={label}
      pressed={pressed}
      onPressedChange={onPressedChange}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors outline-none not-data-pressed:hover:bg-accent not-data-pressed:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft data-pressed:bg-selected data-pressed:text-selected-foreground data-pressed:shadow-none [&_svg]:size-3"
    >
      {pressed && <CheckIcon aria-hidden className="stroke-3" />}
      {children}
    </TogglePrimitive>
  )
}

/**
 * A Pantry entry (PAN-001, PAN-002): its name, then its unit and how many
 * Recipes use it, muted (the count only on a computer: a phone's row has
 * no room beside both pills; Joe, 18 October); on the right, Staple as a tap-to-toggle pill on
 * every row (Joe, 18 October) and, for a staple, Out of stock beside it;
 * then the entry's "…" menu.
 */
export function PantryRow({
  name,
  unit,
  recipes,
  staple = false,
  out = false,
  onStaple,
  onOut,
  menu,
}: {
  name: string
  /** Its default unit: "tbsp". */
  unit?: string
  /** How many Recipes use it. */
  recipes?: number
  staple?: boolean
  out?: boolean
  onStaple?: (on: boolean) => void
  onOut?: (on: boolean) => void
  menu?: ReactNode
}) {
  return (
    <div
      data-slot="pantry-row"
      className="flex min-h-12 items-center gap-3 rounded-control px-3 py-1.5 hover:bg-accent/50"
    >
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
        <span className="truncate font-semibold sm:shrink-0">{name}</span>
        {(unit || !!recipes) && (
          <span className="truncate text-sm text-muted-foreground tabular-nums">
            {unit}
            {!!recipes && (
              <span className="max-sm:hidden">
                {unit && ' · '}
                {recipes} {recipes === 1 ? 'recipe' : 'recipes'}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className={cn(!staple && 'invisible')}>
          <Pill label={`${name} out of stock`} pressed={out} onPressedChange={onOut}>
            Out of stock
          </Pill>
        </span>
        <Pill label={`${name} is a staple`} pressed={staple} onPressedChange={onStaple}>
          Staple
        </Pill>
        {menu}
      </div>
    </div>
  )
}
