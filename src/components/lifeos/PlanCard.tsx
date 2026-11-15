import type { LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/**
 * An Item on Plan (components.md): its Type's icon and name in the Type's
 * colour, its title, then its time and a detail (a place, "Due Fri") in
 * muted text. Done ones are greyed and struck through, past ones greyed
 * (Joe, 15 November); an overdue detail is red, as on Today; a title takes
 * three lines at most; one being dragged lifts. `wide` is the day's list:
 * a little roomier.
 */
export function PlanCard({
  colour,
  icon: Icon,
  type,
  title,
  time,
  detail,
  household,
  late = false,
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
  /** A shared Item's Household's name, last on the line (HSH-003). */
  household?: string
  /** Its due date has passed: the detail is red. */
  late?: boolean
  past?: boolean
  done?: boolean
  dragging?: boolean
  wide?: boolean
  onOpen?: () => void
}) {
  const meta = [time, detail, household].filter(Boolean)
  return (
    <div
      data-slot="plan-card"
      data-colour={colour}
      className={cn(
        'relative flex min-w-0 flex-col rounded-control bg-card shadow-card transition-[box-shadow,opacity]',
        wide ? 'gap-1 px-3.5 py-3' : 'gap-1.5 px-2.5 py-[9px]',
        past && 'bg-[color-mix(in_oklch,var(--card)_50%,transparent)] shadow-none',
        dragging && 'z-10 cursor-grabbing shadow-pop',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold [&_svg]:size-[13px] [&_svg]:shrink-0',
          past || done ? 'text-muted-foreground' : 'text-tc-text',
        )}
      >
        <Icon aria-hidden />
        {type}
      </div>
      <div
        className={cn(
          'font-semibold break-words',
          wide ? 'text-base leading-[1.35]' : 'text-sm leading-[1.3]',
          (done || past) && 'text-muted-foreground',
        )}
      >
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            // A line-through doesn't reach into a button, so the title draws its own.
            className={cn(
              'line-clamp-3 text-left outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
              done && 'line-through',
            )}
          >
            {title}
          </button>
        ) : (
          <span className={cn('line-clamp-3', done && 'line-through')}>{title}</span>
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
              {late && m === detail ? <span className="text-destructive">{m}</span> : m}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
