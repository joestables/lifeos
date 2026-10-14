import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PlanWeekDay {
  key: string
  /** "Mon" */
  name: string
  number: number
  today?: boolean
  /** Its PlanCards: all-day and untimed first, then by time. */
  children?: ReactNode
  /** The day's "+" (AddToDay), shown on hover and focus. */
  add?: ReactNode
  /** Something is being dragged over it. */
  dropping?: boolean
}

/**
 * Plan's week (patterns.md#plan): seven DayColumns side by side, Monday
 * first, each running the height of the page.
 */
export function PlanWeek({ days }: { days: PlanWeekDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-2.5">
      {days.map(({ key, ...day }) => (
        <DayColumn key={key} tall {...day} />
      ))}
    </div>
  )
}

/**
 * A Plan day: the day's name and number (today's in an ink pill), its "+"
 * on hover, and a lightly filled column of PlanCards.
 */
export function DayColumn({
  name,
  number,
  today = false,
  children,
  add,
  dropping = false,
  tall = false,
}: Omit<PlanWeekDay, 'key'> & {
  /** In the week: runs to the foot of the page. */
  tall?: boolean
}) {
  return (
    <div className="group/day flex min-w-0 flex-col gap-2">
      <div className="flex h-8 items-center gap-1.5 px-1">
        <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {name}
        </span>
        <span
          className={cn(
            'text-day leading-7 tabular-nums',
            today && 'rounded-md bg-ink px-2 text-ink-foreground',
          )}
        >
          {number}
        </span>
        {add && (
          <span className="ml-auto opacity-0 transition-opacity group-hover/day:opacity-100 focus-within:opacity-100 has-[[data-popup-open]]:opacity-100">
            {add}
          </span>
        )}
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col gap-1.5 rounded-lg p-1.5 transition-colors',
          tall && 'min-h-[calc(100svh-250px)]',
          today
            ? 'bg-[color-mix(in_oklch,var(--foreground)_5%,transparent)]'
            : 'bg-[color-mix(in_oklch,var(--foreground)_2.5%,transparent)]',
          dropping &&
            'bg-[color-mix(in_oklch,var(--foreground)_7%,transparent)] ring-2 ring-ring-soft',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Where a dragged Item will land: a dashed slot the height of a card. */
export function DropSlot() {
  return (
    <div
      aria-hidden
      className="h-[74px] rounded-control border-[1.5px] border-dashed border-muted-foreground/35"
    />
  )
}
