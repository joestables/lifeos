import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

export interface PlanWeekDay {
  key: string
  /** "Mon" */
  name: string
  number: number
  today?: boolean
  /** Its cards, untimed first, then by time. */
  children?: ReactNode
  /** The day's "+" (AddToDay), shown on hover and focus. */
  add?: ReactNode
  /** Something is being dragged over it. */
  dropping?: boolean
}

export interface AllDaySpan {
  key: string
  colour: TypeColour
  icon: LucideIcon
  title: string
  /** Its first and last day in the week, 0 (Monday) to 6. */
  from: number
  to: number
  /** It began before this week, or goes on after it. */
  before?: boolean
  after?: boolean
  marks?: ReactNode
}

/** Fits all-day spans into as few lanes as they need, earliest first. */
function lanes(spans: AllDaySpan[]): AllDaySpan[][] {
  const out: AllDaySpan[][] = []
  for (const span of [...spans].sort((a, b) => a.from - b.from || b.to - a.to)) {
    const lane = out.find((l) => l.every((s) => s.to < span.from || s.from > span.to))
    if (lane) lane.push(span)
    else out.push([span])
  }
  return out
}

/** An all-day Item across the days it lasts: a bar in its Type's tint. */
export function AllDayBar({
  colour,
  icon: Icon,
  title,
  before = false,
  after = false,
  marks,
  className,
}: Omit<AllDaySpan, 'key' | 'from' | 'to'> & { className?: string }) {
  return (
    <div
      data-colour={colour}
      className={cn(
        'flex h-7 min-w-0 items-center gap-1.5 rounded-control bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] px-2.5 text-xs font-[650] text-tc-text',
        before && 'rounded-l-none',
        after && 'rounded-r-none',
        className,
      )}
    >
      <Icon aria-hidden className="size-[13px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {marks && <span className="flex shrink-0 items-center gap-1 [&_svg]:size-3">{marks}</span>}
    </div>
  )
}

/**
 * Plan's week (patterns.md#plan): seven days, Monday first, each a lightly
 * filled column; all-day Items as bars across the days they last, then each
 * day's cards. Today's number sits in an ink pill and its column is filled a
 * little more.
 */
export function PlanWeek({ days, allDay = [] }: { days: PlanWeekDay[]; allDay?: AllDaySpan[] }) {
  const rows = lanes(allDay)
  const cardsRow = rows.length + 2
  return (
    <div
      className="grid grid-cols-7 gap-x-2.5"
      style={{ gridTemplateRows: `auto repeat(${rows.length}, auto) 1fr` }}
    >
      {days.map((day, i) => (
        <div
          key={`head-${day.key}`}
          className="group/day flex h-11 items-center gap-1.5 px-1.5"
          style={{ gridColumn: i + 1, gridRow: 1 }}
        >
          <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            {day.name}
          </span>
          <span
            className={cn(
              'text-day leading-7 tabular-nums',
              day.today && 'rounded-md bg-ink px-2 text-ink-foreground',
            )}
          >
            {day.number}
          </span>
          {day.add && (
            <span className="ml-auto opacity-0 transition-opacity group-hover/day:opacity-100 focus-within:opacity-100 has-[[data-popup-open]]:opacity-100 max-md:opacity-100">
              {day.add}
            </span>
          )}
        </div>
      ))}
      {days.map((day, i) => (
        <div
          key={`fill-${day.key}`}
          aria-hidden
          className={cn(
            'rounded-lg transition-colors',
            day.today
              ? 'bg-[color-mix(in_oklch,var(--foreground)_5%,transparent)]'
              : 'bg-[color-mix(in_oklch,var(--foreground)_2.5%,transparent)]',
            day.dropping &&
              'bg-[color-mix(in_oklch,var(--foreground)_7%,transparent)] ring-2 ring-ring-soft',
          )}
          style={{ gridColumn: i + 1, gridRow: cardsRow }}
        />
      ))}
      {rows.map((lane, r) =>
        lane.map((span) => (
          <div
            key={span.key}
            className={cn('relative z-[1]', r === rows.length - 1 ? 'pb-2' : 'pb-1')}
            style={{ gridColumn: `${span.from + 1} / ${span.to + 2}`, gridRow: r + 2 }}
          >
            <AllDayBar
              colour={span.colour}
              icon={span.icon}
              title={span.title}
              before={span.before}
              after={span.after}
              marks={span.marks}
            />
          </div>
        )),
      )}
      {days.map((day, i) => (
        <div
          key={`cards-${day.key}`}
          className="relative z-[1] flex min-h-40 min-w-0 flex-col gap-1.5 p-1.5"
          style={{ gridColumn: i + 1, gridRow: cardsRow }}
        >
          {day.children}
        </div>
      ))}
    </div>
  )
}

/** The present moment in today's column or list: an ink line with the time. */
export function NowLine({ time }: { time: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5" aria-label={`Now, ${time}`}>
      <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
      <span className="h-px flex-1 bg-foreground/70" />
      <span className="text-xs font-semibold text-foreground tabular-nums">{time}</span>
    </div>
  )
}

/** Where a dragged Item will land: a dashed slot the height of a card. */
export function DropSlot() {
  return (
    <div
      aria-hidden
      className="h-[58px] rounded-control border-[1.5px] border-dashed border-muted-foreground/35"
    />
  )
}
