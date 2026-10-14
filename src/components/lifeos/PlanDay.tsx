import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * One day on Plan (PLN-002): its all-day Items first, then the rest, each
 * ItemRow beside its time in a narrow column on the left, so the day reads
 * down like a timetable without an hour grid.
 */
export function PlanDay({ allDay, children }: { allDay?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {allDay && <div className="flex flex-col gap-1.5 pb-2.5">{allDay}</div>}
      {children}
    </div>
  )
}

/** A line of a day: its time (or nothing, for an untimed Task) and its row. */
export function PlanDayLine({
  time,
  until,
  children,
  className,
}: {
  time?: string
  /** When it ends, under its start. */
  until?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[52px_minmax(0,1fr)] gap-2 max-sm:grid-cols-[44px_minmax(0,1fr)]',
        className,
      )}
    >
      <div className="flex flex-col pt-[11px] text-right text-sm tabular-nums">
        {time && <span className="font-semibold">{time}</span>}
        {until && <span className="text-xs text-muted-foreground">{until}</span>}
      </div>
      {children}
    </div>
  )
}
