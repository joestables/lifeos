import type { LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/**
 * An Item on Plan (components.md): its Type's icon and name in the Type's
 * colour, its title, then its time and a detail (a place, "Due Fri") in
 * muted text. Past Items fade; done ones are struck through, not faded
 * (Joe, 14 November); one being
 * dragged lifts. `wide` is the day's list: a little roomier.
 */
export function PlanCard({
  colour,
  icon: Icon,
  type,
  title,
  time,
  detail,
  past = false,
  done = false,
  dragging = false,
  wide = false,
  onOpen,
}: {
  colour: TypeColour
  icon: LucideIcon
  /** "Task", "Event", "Dinner" */
  type: string
  title: string
  /** "19:30", "19:30–21:30", "All day"; a Reminder's times, an Alarm's with its clock; none for an untimed Task. */
  time?: ReactNode
  /** A place, "Due Fri". */
  detail?: string
  past?: boolean
  done?: boolean
  dragging?: boolean
  wide?: boolean
  onOpen?: () => void
}) {
  const meta = [time, detail].filter(Boolean)
  return (
    <div
      data-slot="plan-card"
      data-colour={colour}
      className={cn(
        'relative flex min-w-0 flex-col rounded-control bg-card shadow-card transition-[box-shadow,opacity]',
        wide ? 'gap-1 px-3.5 py-3' : 'gap-1.5 px-2.5 py-[9px]',
        past && 'opacity-50 shadow-none',
        dragging && 'z-10 cursor-grabbing opacity-100 shadow-pop',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-tc-text [&_svg]:size-[13px] [&_svg]:shrink-0">
        <Icon aria-hidden />
        {type}
      </div>
      <div
        className={cn(
          'font-[650] break-words',
          wide ? 'text-base leading-[1.35]' : 'text-sm leading-[1.3]',
          done && 'line-through',
        )}
      >
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:ring-3 focus-visible:after:ring-ring-soft"
          >
            {title}
          </button>
        ) : (
          title
        )}
      </div>
      {meta.length > 0 && (
        <div
          className={cn(
            'truncate text-muted-foreground tabular-nums',
            wide ? 'text-sm' : 'text-xs',
          )}
        >
          {meta.map((m, i) => (
            <Fragment key={i}>
              {i > 0 && ' · '}
              {m}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
