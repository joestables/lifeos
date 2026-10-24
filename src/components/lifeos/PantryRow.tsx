import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function Pill({
  pressed,
  onPressedChange,
  children,
  label,
  warning = false,
}: {
  pressed: boolean
  onPressedChange?: (on: boolean) => void
  children: ReactNode
  label: string
  /** On, in amber rather than the page's colour: out of stock or Required (Joe, 21 October). */
  warning?: boolean
}) {
  return (
    <TogglePrimitive
      aria-label={label}
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors outline-none not-data-pressed:hover:bg-accent not-data-pressed:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft data-pressed:bg-selected data-pressed:text-selected-foreground data-pressed:shadow-none [&_svg]:size-3',
        warning &&
          'data-pressed:bg-[color-mix(in_oklch,var(--warning)_16%,transparent)] data-pressed:text-warning',
      )}
    >
      {pressed && <CheckIcon aria-hidden className="stroke-3" />}
      {children}
    </TogglePrimitive>
  )
}

/**
 * A Pantry entry (PAN-001): its name, then how many Recipes use it, muted
 * (no unit: Joe, 23 October; the count only on a computer), then its "…"
 * menu. Staples and Essentials are kept on Shopping (SHP-005).
 */
export function PantryRow({
  name,
  recipes,
  menu,
}: {
  name: string
  /** How many Recipes use it. */
  recipes?: number
  menu?: ReactNode
}) {
  return (
    <div
      data-slot="pantry-row"
      className="flex min-h-12 items-center gap-3 rounded-control px-3 py-1.5 hover:bg-accent/50"
    >
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
        <span className="truncate font-semibold sm:shrink-0">{name}</span>
        {!!recipes && (
          <span className="truncate text-sm text-muted-foreground tabular-nums max-sm:hidden">
            {recipes} {recipes === 1 ? 'recipe' : 'recipes'}
          </span>
        )}
      </div>
      {menu}
    </div>
  )
}

/**
 * A Card of PantryRows (PAN-001): an aisle, named at its top (muted, 14px,
 * weight 600), or the household items or names kept as typed, unnamed.
 */
export function PantryAisle({
  label,
  title = true,
  children,
}: {
  /** Its name, read out and, with `title`, shown. */
  label: string
  title?: boolean
  children: ReactNode
}) {
  return (
    <Card role="group" aria-label={label} className="gap-0 px-2 py-1.5">
      {title && (
        <div className="px-3 pt-2.5 pb-1 text-sm font-semibold text-muted-foreground">{label}</div>
      )}
      {children}
    </Card>
  )
}
