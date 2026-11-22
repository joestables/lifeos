import { CloudAlertIcon, CloudIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useLasting } from '@/hooks/use-lasting'

/**
 * Any list of Items: tile or checkbox, title and meta, then actions that
 * appear on hover and focus on a computer, taking no room until then, and
 * the "…" menu, unseen until then (only the menu on a phone, always
 * showing), which is always last. With onOpen, tapping the row opens
 * the Item. Done: greyed and struck through; past: greyed (Joe, 15 November).
 */
export function ItemRow({
  leading,
  title,
  meta = [],
  actions,
  menu,
  mark,
  trailing,
  onOpen,
  done = false,
  past = false,
  sync,
  className,
}: {
  leading: ReactNode
  title: ReactNode
  /** Parts of the meta line, joined with "·". */
  meta?: ReactNode[]
  /** On hover and focus, on a computer only (Task, Note, Tomorrow). */
  actions?: ReactNode
  /** The "…" menu: with the actions on a computer, always on a phone. */
  menu?: ReactNode
  /** A mark that always shows, before the actions and the menu (a starred Task's star). */
  mark?: ReactNode
  /** A control that always shows, at the end (Restore). */
  trailing?: ReactNode
  /** Opens the Item: the whole row, but for its controls. */
  onOpen?: () => void
  done?: boolean
  /** Its time has gone (a Reminder whose Alerts have all gone off, an Event ended): greyed, as on Week. */
  past?: boolean
  /** Whether the Item's latest change has reached the server (patterns.md#states); pending is said after 3s. */
  sync?: 'pending' | 'failed'
  className?: string
}) {
  const parts = [...meta]
  // Said only once it has waited a while: not for one that sends at once.
  const waiting = useLasting(sync === 'pending')
  if (waiting)
    parts.push(
      <span className="inline-flex items-center gap-1">
        <CloudIcon className="size-3.5" /> Not sent yet
      </span>,
    )
  if (sync === 'failed')
    parts.push(
      <span className="inline-flex items-center gap-1 text-destructive">
        <CloudAlertIcon className="size-3.5" /> Not saved
      </span>,
    )
  return (
    <div
      data-slot="item-row"
      data-done={done || undefined}
      data-past={past || undefined}
      className={cn(
        'group/row relative flex min-h-14 items-center gap-3 rounded-row bg-card px-3.5 py-2.5 shadow-card',
        past &&
          'bg-[color-mix(in_oklch,var(--card)_50%,transparent)] shadow-none [&_[data-slot=type-tile]]:grayscale',
        className,
      )}
    >
      <div className="relative z-10 flex">{leading}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div
          className={cn(
            'truncate font-semibold',
            (done || past) && 'text-muted-foreground',
            done && 'line-through',
          )}
        >
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              // A line-through and an ellipsis don't reach into a button, so the title draws its own.
              className={cn(
                'block max-w-full truncate rounded-[2px] text-left outline-none after:absolute after:inset-0 after:rounded-row focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
                done && 'line-through',
              )}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </div>
        {parts.length > 0 && (
          // "·" spaced as a space either side, as every other meta line (PanelRow, PlanCard, MealCard).
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
            {parts.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && <span aria-hidden>·</span>}
                {part}
              </Fragment>
            ))}
          </div>
        )}
      </div>
      {mark && <div className="relative z-10 flex">{mark}</div>}
      {/*
        On a computer the hover actions take no room until shown, so a mark
        sits just before the "…", as on a phone (Joe, 22 November); the "…"
        keeps its place, unseen until hover or focus.
      */}
      {(actions || menu) && (
        <div className="relative z-10 flex items-center gap-1">
          {actions && (
            <div className="hidden items-center gap-1 md:group-focus-within/row:flex md:group-hover/row:flex md:group-has-[[data-popup-open]]/row:flex">
              {actions}
            </div>
          )}
          {menu && (
            <div className="flex opacity-100 transition-opacity md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100 md:has-[[data-popup-open]]:opacity-100">
              {menu}
            </div>
          )}
        </div>
      )}
      {trailing && <div className="relative z-10 flex">{trailing}</div>}
    </div>
  )
}
