import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { CheckIcon, PackageIcon, StarIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function Pill({
  pressed,
  onPressedChange,
  children,
  label,
  warning = false,
  className,
}: {
  className?: string
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
        className,
      )}
    >
      {pressed && <CheckIcon aria-hidden className="stroke-3" />}
      {children}
    </TogglePrimitive>
  )
}

/**
 * A Pantry entry (PAN-001): its name and, muted, what the page shows of it
 * (its aisle, its default unit, how many Recipes use it), each as Show chooses;
 * then its actions (whether it's a staple or an Essential) and its "…" menu.
 */
export function PantryRow({
  name,
  meta,
  recipes,
  actions,
  menu,
}: {
  name: string
  /** "Fruit & Veg · g", as the Pantry's Show chooses. */
  meta?: string
  /** How many Recipes use it. */
  recipes?: number
  actions?: ReactNode
  menu?: ReactNode
}) {
  return (
    <div
      data-slot="pantry-row"
      className="flex min-h-12 items-center gap-2 rounded-control py-1.5 pr-1 pl-3 hover:bg-accent/50"
    >
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
        <span className="truncate font-semibold sm:shrink-0">{name}</span>
        {(meta || !!recipes) && (
          <span className="truncate text-xs text-muted-foreground tabular-nums sm:text-sm">
            {meta}
            {meta && !!recipes && ' · '}
            {!!recipes && `${recipes} ${recipes === 1 ? 'recipe' : 'recipes'}`}
          </span>
        )}
      </div>
      {actions}
      {menu}
    </div>
  )
}

export type Kept = 'staple' | 'essential'

function KeepToggle({
  label,
  pressed,
  onPressedChange,
  fill = false,
  children,
}: {
  label: string
  pressed: boolean
  onPressedChange: (on: boolean) => void
  /** Its icon filled when on (the star); else only the tint shows it. */
  fill?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            aria-label={label}
            pressed={pressed}
            onPressedChange={onPressedChange}
            className={cn(
              'data-pressed:bg-selected data-pressed:text-selected-foreground',
              !fill && 'data-pressed:[&_svg]:fill-none',
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Whether an entry is one of a Space's staples (`package`) or Essentials
 * (`star`), one at most, each a Toggle tinted when on, the star filled
 * (Joe, 25 October);
 * once it is, its "Out of stock" or "Required" Pill first, amber when on.
 */
export function KeepToggles({
  name,
  kept,
  needed = false,
  onKept,
  onNeeded,
}: {
  name: string
  kept: Kept | null
  needed?: boolean
  /** A kind, or none: taken off. */
  onKept: (kept: Kept | null) => void
  onNeeded: (on: boolean) => void
}) {
  const flag = kept === 'staple' ? 'Out of stock' : 'Required'
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {kept && (
        <Pill
          label={`${name} ${flag.toLowerCase()}`}
          pressed={needed}
          onPressedChange={onNeeded}
          warning
        >
          {flag}
        </Pill>
      )}
      <span className={cn('flex items-center gap-0.5', kept && 'ml-1.5')}>
        <KeepToggle
          label={`Staple: ${name}`}
          pressed={kept === 'staple'}
          onPressedChange={(on) => onKept(on ? 'staple' : null)}
        >
          <PackageIcon />
        </KeepToggle>
        <KeepToggle
          label={`Essential: ${name}`}
          pressed={kept === 'essential'}
          onPressedChange={(on) => onKept(on ? 'essential' : null)}
          fill
        >
          <StarIcon />
        </KeepToggle>
      </span>
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
