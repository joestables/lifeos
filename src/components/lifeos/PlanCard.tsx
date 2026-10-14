import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/**
 * An Item on a Plan day (components.md): its time beside its Type's icon (or
 * a Task's checkbox), its title, and a muted detail line (a place, a due
 * date). Small marks — repeats, from Google Calendar — sit top right. Past
 * Items fade; done ones are struck through; one being dragged lifts.
 */
export function PlanCard({
  colour,
  icon: Icon,
  type,
  title,
  time,
  detail,
  leading,
  marks,
  past = false,
  done = false,
  dragging = false,
  onOpen,
}: {
  colour: TypeColour
  icon: LucideIcon
  /** The Type's name, for screen readers when no time is shown. */
  type: string
  title: string
  /** "19:30", "19:30–21:30"; none for an untimed Task. */
  time?: string
  /** A place, a due date. */
  detail?: ReactNode
  /** A Task's checkbox, in place of its icon. */
  leading?: ReactNode
  /** Small muted icons: repeats, from Google Calendar. */
  marks?: ReactNode
  past?: boolean
  done?: boolean
  dragging?: boolean
  onOpen?: () => void
}) {
  return (
    <div
      data-slot="plan-card"
      data-colour={colour}
      className={cn(
        'group/card relative flex min-w-0 flex-col gap-1 rounded-control bg-card px-2.5 py-2 shadow-card transition-[box-shadow,opacity] hover:shadow-pop',
        (past || done) && 'opacity-50 shadow-none',
        dragging && 'z-10 rotate-[1.5deg] cursor-grabbing opacity-100 shadow-pop',
      )}
    >
      <div className="flex h-4 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        {leading ? (
          <span className="relative z-10 flex [&_[data-slot=checkbox]]:size-4">{leading}</span>
        ) : (
          <Icon aria-hidden className="size-[13px] shrink-0 text-tc-text" />
        )}
        <span className={cn('min-w-0 flex-1 truncate', time && 'font-semibold text-foreground/80')}>
          {time ?? <span className="sr-only">{type}</span>}
        </span>
        {marks && (
          <span className="flex shrink-0 items-center gap-1 [&_svg]:size-3 [&_svg]:text-muted-foreground">
            {marks}
          </span>
        )}
      </div>
      <div
        className={cn(
          'line-clamp-2 text-sm leading-[1.3] font-[650] break-words',
          done && 'text-muted-foreground line-through',
        )}
      >
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              'text-left outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
              done && 'line-through',
            )}
          >
            {title}
          </button>
        ) : (
          title
        )}
      </div>
      {detail && (
        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0">
          <span className="flex min-w-0 items-center gap-1 truncate [&>span]:truncate">
            {detail}
          </span>
        </div>
      )}
    </div>
  )
}
