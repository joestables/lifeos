import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Pill } from './PantryRow'

/**
 * A line on a shopping list (SHP-001 4): its Checkbox in Shopping's yellow,
 * its name (weight 600) and, muted under it, what it's for ("Katsu Thu,
 * Curry Sat"); its amount at the end, tabular; then, for a line I added,
 * its × (Joe, 25 October), which a Meal's line doesn't have (SHP-003 2). The whole row ticks it; ticked, the
 * name is struck through and the row fades.
 */
export function ShoppingLine({
  name,
  amount,
  meta,
  checked = false,
  onCheck,
  menu,
}: {
  name: string
  /** Its total, worked out on the device ("1.2 kg", "Salt 5 g +"). */
  amount?: string
  /** What it's for, or where it came from. */
  meta?: ReactNode
  checked?: boolean
  onCheck?: (on: boolean) => void
  menu?: ReactNode
}) {
  return (
    <div
      data-slot="shopping-line"
      data-checked={checked || undefined}
      className="flex min-h-11 items-center gap-1 rounded-control pr-1 hover:bg-accent/50 max-sm:min-h-12"
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch py-1.5 pl-3">
        <Checkbox colour="yellow" checked={checked} onCheckedChange={(on) => onCheck?.(on)} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'truncate font-semibold',
              checked && 'text-muted-foreground line-through',
            )}
          >
            {name}
          </span>
          {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
        </span>
        {amount && (
          <span
            className={cn(
              'shrink-0 pr-2 text-sm font-semibold tabular-nums',
              checked && 'text-muted-foreground',
            )}
          >
            {amount}
          </span>
        )}
      </label>
      {menu}
    </div>
  )
}

/**
 * Something Extra offers (SHP-003 3; Joe, 25 October): its name and, muted,
 * why it's offered ("Katsu Thu", "Out of stock", "Home · Mum's"); then a
 * fixed-width Pill, "Add" with a `plus`, or "Added" with a tick once it's
 * on the shop, pressed again to take it off. The Pill never changes width.
 */
export function OfferRow({
  name,
  meta,
  added = false,
  onToggle,
}: {
  name: string
  meta?: ReactNode
  added?: boolean
  onToggle: (on: boolean) => void
}) {
  return (
    <div
      data-slot="offer-row"
      className="flex min-h-11 items-center gap-3 rounded-control py-1.5 pr-1.5 pl-3 hover:bg-accent/50 max-sm:min-h-12"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{name}</span>
        {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      <Pill
        label={added ? `Take ${name} off` : `Add ${name}`}
        pressed={added}
        onPressedChange={onToggle}
        className="w-[78px] justify-center"
      >
        {added ? (
          'Added'
        ) : (
          <>
            <PlusIcon aria-hidden />
            Add
          </>
        )}
      </Pill>
    </div>
  )
}

/**
 * One of a Space's Staples or Essentials (SHP-005): its name, then its
 * "Out of stock" or "Required" pill, amber when on, then its "…" menu.
 */
export function KeptRow({
  name,
  flag,
  on = false,
  onChange,
  menu,
}: {
  name: string
  /** "Out of stock" for a staple, "Required" for an Essential. */
  flag: string
  on?: boolean
  onChange?: (on: boolean) => void
  menu?: ReactNode
}) {
  return (
    <div
      data-slot="kept-row"
      className="flex min-h-11 items-center gap-3 rounded-control py-1.5 pr-1 pl-3 hover:bg-accent/50"
    >
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      <Pill label={`${name} ${flag.toLowerCase()}`} pressed={on} onPressedChange={onChange} warning>
        {flag}
      </Pill>
      {menu}
    </div>
  )
}
