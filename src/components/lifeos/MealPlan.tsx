import { LockIcon, PlusIcon, RotateCcwIcon, UtensilsIcon } from 'lucide-react'
import type * as React from 'react'
import { useState, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/** The three slots, in order (Joe, 18 October). */
export type Slot = 'Breakfast' | 'Lunch' | 'Dinner'

/**
 * A Meal on the Meal plan (MPL-001), shaped like a PlanCard: its name, up
 * to two lines, then a muted line with its servings (or "Leftovers"), its
 * Variation when its Recipe has more than one, and a lock when it's
 * Personal while the plan shows Household meals too: only the exception is
 * marked, so a week of shared dinners isn't a row of icons. A typed Meal or leftovers sit lighter, with no card shadow.
 * Eaten, it fades and is struck through; being dragged, it lifts. Its
 * picture, when it has one (its Recipe's photo, or a typed Meal's from its
 * link), heads it (Joe, 23 October). While choosing Meals for a food shop
 * (SHP-002 1), a checkbox sits at its top right, the whole card chooses it,
 * and a chosen card is ringed, as a RecipeCard is.
 */
export function MealCard({
  name,
  photo,
  servings,
  variation,
  kind = 'recipe',
  personal = false,
  household,
  dragging = false,
  eaten = false,
  selecting = false,
  selected = false,
  unavailable,
  slot,
  row = false,
  onOpen,
  onSelect,
}: {
  /** On a phone: its picture a small square at the start, the words beside it. */
  row?: boolean
  /** Its slot, first on its muted line, where the slots aren't named (a phone). */
  slot?: Slot
  name: string
  /** Its picture's address. */
  photo?: string
  servings?: number
  /** When its Recipe has more than one. */
  variation?: string
  kind?: 'recipe' | 'typed' | 'leftovers'
  /** Personal, among Household Meals: marked with a lock. */
  personal?: boolean
  /** Its Household's name, among the Meals of several (HSH-003 1). */
  household?: string
  dragging?: boolean
  eaten?: boolean
  /** Choosing Meals for a food shop: Select on the week (SHP-002 1). */
  selecting?: boolean
  /**
   * While choosing, why this one can't be ("On Big shop", "Eaten",
   * "Leftovers"): faded, its photo grey, the reason its muted line, and a
   * press does nothing (Joe, 26 October).
   */
  unavailable?: string
  selected?: boolean
  onOpen?: () => void
  onSelect?: (on: boolean) => void
}) {
  const [broken, setBroken] = useState<string>()
  const parts = unavailable
    ? [slot, unavailable].filter(Boolean)
    : [
        slot,
        kind === 'leftovers' ? 'Leftovers' : servings ? `Serves ${servings}` : null,
        variation,
        household,
      ].filter(Boolean)
  return (
    <div
      data-slot="meal-card"
      data-selected={selected || undefined}
      className={cn(
        'relative flex min-w-0 rounded-control px-2.5 py-2 transition-[box-shadow,opacity]',
        row
          ? cn(
              'min-h-12 flex-row items-center gap-2.5 py-1.5',
              photo && photo !== broken && 'pl-1.5',
            )
          : 'flex-col gap-1',
        kind === 'recipe'
          ? 'bg-card shadow-card'
          : 'bg-[color-mix(in_oklch,var(--card)_50%,transparent)] shadow-[inset_0_0_0_1px_var(--border)]',
        eaten && 'opacity-50 shadow-none',
        unavailable && 'pointer-events-none opacity-45 shadow-none [&_img]:grayscale',
        dragging && 'z-10 cursor-grabbing opacity-100 shadow-pop',
        'data-selected:ring-2 data-selected:ring-ring',
        selecting && 'pr-10',
      )}
    >
      {selecting && (
        <span className="pointer-events-none absolute top-1.5 right-1.5 z-10 grid size-7 place-items-center rounded-sm bg-popover/85 shadow-card backdrop-blur-sm">
          <Checkbox checked={selected} tabIndex={-1} aria-hidden />
        </span>
      )}
      {photo && photo !== broken && (
        <img
          src={photo}
          alt=""
          draggable={false}
          // A picture that can't be shown (offline, not kept yet) leaves no gap.
          onError={() => setBroken(photo)}
          className={cn(
            'rounded-xs object-cover',
            row ? 'size-10 shrink-0 self-center' : 'h-14 w-full',
          )}
        />
      )}
      <div className={cn('flex min-w-0 flex-col gap-1', row && 'flex-1 gap-0.5')}>
        <button
          type="button"
          role={selecting ? 'checkbox' : undefined}
          aria-checked={selecting ? selected : undefined}
          aria-disabled={unavailable ? true : undefined}
          tabIndex={unavailable ? -1 : undefined}
          onClick={selecting ? () => onSelect?.(!selected) : onOpen}
          className={cn(
            cn(
              row ? 'line-clamp-1' : 'line-clamp-2',
              'text-left text-sm leading-[1.3] font-[650] break-words outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
            ),
            eaten && 'line-through',
          )}
        >
          {name}
        </button>
        {(parts.length > 0 || personal || kind !== 'recipe') && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums [&_svg]:size-3 [&_svg]:shrink-0">
            {kind === 'leftovers' && <RotateCcwIcon aria-hidden />}
            {kind === 'typed' && <UtensilsIcon aria-hidden />}
            <span className="truncate">{parts.join(' · ')}</span>
            {personal && <LockIcon aria-label="Personal" className="ml-auto" />}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * One slot of a day in the week (Breakfast, Lunch, Dinner), named down the
 * week's left: its Meals; empty, a dashed "+" that shows on hover, focus
 * and while chosen.
 */
export function MealSlot({
  slot,
  children,
  add,
  adding = false,
  dragging = false,
  label = false,
  drop,
}: {
  slot: Slot
  /** Its name over it, as Stage 4's design pages showed a phone's day. */
  label?: boolean
  /** Where a Meal dragged here goes ("2026-10-15:dinner"). */
  drop?: string
  children?: ReactNode
  /** The slot's "+": opens the search (MPL-002). */
  add?: ReactNode
  adding?: boolean
  /** A Meal is being dragged: the "+" stays hidden, so a slot under it is only shaded. */
  dragging?: boolean
}) {
  const empty = !children
  return (
    <div data-drop={drop} className="group/slot flex min-w-0 flex-col gap-1">
      {label && (
        <div className="px-1 text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {slot}
        </div>
      )}
      {children}
      {empty && (
        <div
          className={cn(
            'opacity-0 transition-opacity group-hover/slot:opacity-100 focus-within:opacity-100',
            adding && 'opacity-100',
            dragging && 'invisible',
          )}
        >
          {add ?? <AddMealButton slot={slot} />}
        </div>
      )}
    </div>
  )
}

/** An empty slot's "+": a dashed, card-high box. */
export function AddMealButton({ slot, ...props }: React.ComponentProps<'button'> & { slot: Slot }) {
  return (
    <button
      type="button"
      aria-label={`Add ${slot.toLowerCase()}`}
      className={cn(
        'grid w-full place-items-center rounded-control border-[1.5px] border-dashed border-muted-foreground/30 text-muted-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft data-popup-open:bg-accent [&_svg]:size-4',
        'h-[46px]',
      )}
      {...props}
    >
      <PlusIcon aria-hidden />
    </button>
  )
}

/**
 * A day on a phone's Meal plan (Joe, 26 October): the day's name on a line,
 * today's in an ink pill, a hairline, then its "+"; under it its Meals in
 * slot order, each saying its slot. A Meal dragged here keeps its slot.
 */
export function MealDay({
  name,
  date,
  today = false,
  drop,
  dropping = false,
  action,
  children,
}: {
  /** "Thu" */
  name: string
  /** "15 Oct" */
  date: string
  today?: boolean
  /** Where a Meal dragged here goes: the day ("2026-10-15"). */
  drop?: string
  dropping?: boolean
  /** At the end of the day's line: its "+". */
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <section
      aria-label={`${name} ${date}`}
      data-drop={drop}
      className={cn(
        '-mx-2 flex flex-col gap-2 rounded-lg px-2 pb-2 transition-colors',
        dropping && 'bg-accent ring-2 ring-ring-soft',
      )}
    >
      <div className="flex min-h-9 items-center gap-2">
        <span
          className={cn(
            'text-base font-bold',
            today && 'rounded-sm bg-ink px-2 py-0.5 text-ink-foreground',
          )}
        >
          {name} {date}
        </span>
        <span className="h-px flex-1 bg-border" />
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * The Meal plan's week on a computer (MPL-001): seven days, Monday first,
 * laid out as Plan's week, with a row for each slot so Breakfast, Lunch and
 * Dinner line up across the days, named once down the left. Each day is a
 * lightly filled column, today's filled a little more.
 */
export function MealWeek({
  days,
  slots,
  cell,
}: {
  days: { key: string; name: string; number: number; today?: boolean; dropping?: string }[]
  slots: readonly Slot[]
  /** A day's slot: a MealSlot without its label. */
  cell: (day: string, slot: Slot) => ReactNode
}) {
  return (
    <div
      role="grid"
      aria-label="Week"
      className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] gap-x-2.5"
    >
      <div aria-hidden />
      {days.map((d) => (
        <div key={d.key} role="columnheader" className="flex h-8 items-center gap-1.5 px-1">
          <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            {d.name}
          </span>
          <span
            className={cn(
              'text-day leading-7 tabular-nums',
              d.today && 'rounded-md bg-ink px-2 text-ink-foreground',
            )}
          >
            {d.number}
          </span>
        </div>
      ))}
      {slots.map((slot, row) => (
        <div key={slot} role="row" className="contents">
          <div
            role="rowheader"
            className={cn(
              'pt-4 text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase',
              row === 0 && 'mt-2.5 pt-5',
            )}
          >
            {slot}
          </div>
          {days.map((d) => (
            <div
              key={`${d.key}-${slot}`}
              role="gridcell"
              aria-label={`${d.name} ${slot.toLowerCase()}`}
              data-drop={`${d.key}:${slot.toLowerCase()}`}
              className={cn(
                'flex min-h-[78px] min-w-0 flex-col justify-start px-1.5 py-2',
                d.today
                  ? 'bg-[color-mix(in_oklch,var(--foreground)_5%,transparent)]'
                  : 'bg-[color-mix(in_oklch,var(--foreground)_2.5%,transparent)]',
                row === 0 && 'mt-2.5 rounded-t-lg pt-2.5',
                row === slots.length - 1 && 'rounded-b-lg pb-2.5',
                row > 0 && 'border-t border-dashed border-foreground/6',
                // Shaded and outlined (Joe, 3 November; patterns.md#dragging).
                d.dropping === slot &&
                  'bg-[color-mix(in_oklch,var(--foreground)_7%,transparent)] ring-2 ring-ring-soft ring-inset',
              )}
            >
              {cell(d.key, slot)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
