import { CheckIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Pill } from './PantryRow'

/**
 * A line on a shopping list (SHP-001 4): its Checkbox in Shopping's yellow,
 * its name (weight 600) and, muted under it, what it's for ("Katsu Thu,
 * Curry Sat"); its amount at the end, tabular; then its "…" menu, which a
 * Meal's line doesn't have (SHP-003 2). The whole row ticks it; ticked, the
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
 * Something Extra offers (SHP-003 3): its name and, muted, why it's offered;
 * an amber "Out of stock" or "Required" Badge when it is needed; then "+",
 * or "Added" once it's on the shop. Without `onAdd` it is only shown: the
 * staples the Meals use, to check they're in.
 */
export function OfferRow({
  name,
  meta,
  needed,
  added = false,
  onAdd,
}: {
  name: string
  meta?: ReactNode
  /** "Out of stock" or "Required". */
  needed?: string
  added?: boolean
  onAdd?: () => void
}) {
  return (
    <div
      data-slot="offer-row"
      className="flex min-h-11 items-center gap-3 rounded-control py-1.5 pr-1 pl-3 max-sm:min-h-12"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{name}</span>
        {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      {needed && <Badge variant="warning">{needed}</Badge>}
      {onAdd &&
        (added ? (
          <span className="inline-flex h-8 items-center gap-1 px-2 text-sm font-semibold text-muted-foreground [&_svg]:size-4">
            <CheckIcon aria-hidden /> Added
          </span>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={`Add ${name}`} onClick={onAdd}>
            <PlusIcon />
          </Button>
        ))}
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
