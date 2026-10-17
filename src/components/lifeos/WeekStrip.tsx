import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

export interface WeekStripDay {
  key: string
  /** "Mon" */
  name: string
  number: number
  today?: boolean
  /** The colours of what is on it, one dot each, at most three. */
  dots?: TypeColour[]
}

/**
 * The week above a single day (Plan's day, and a phone): seven days to
 * choose between; the chosen day filled `--accent`, today's number in an ink
 * pill, and a dot for each kind of thing on a day.
 */
export function WeekStrip({
  days,
  chosen,
  onChoose,
}: {
  days: WeekStripDay[]
  chosen: string
  onChoose: (key: string) => void
}) {
  return (
    <div role="tablist" aria-label="Days" className="grid grid-cols-7 gap-1">
      {days.map((day) => (
        <button
          key={day.key}
          type="button"
          role="tab"
          aria-selected={day.key === chosen}
          onClick={() => onChoose(day.key)}
          className="flex h-[68px] flex-col items-center justify-center gap-1 rounded-row outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft aria-selected:bg-accent"
        >
          <span className="text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            {day.name}
          </span>
          <span
            className={cn(
              'grid h-6 min-w-6 place-items-center rounded-md px-1 text-[15px] font-[650] tabular-nums',
              day.today && 'bg-ink text-ink-foreground',
            )}
          >
            {day.number}
          </span>
          <span className="flex h-1.5 gap-[3px]">
            {(day.dots ?? []).slice(0, 3).map((colour, i) => (
              <span key={i} data-colour={colour} className="size-1.5 rounded-full bg-tc" />
            ))}
          </span>
        </button>
      ))}
    </div>
  )
}
