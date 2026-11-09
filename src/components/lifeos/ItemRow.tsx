import { CloudAlertIcon, CloudIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Any list of Items: tile or checkbox, title and meta, then actions that
 * appear on hover and focus and the "…" menu (only the menu on a phone,
 * always showing). With onOpen, tapping the row opens the Item.
 */
export function ItemRow({
  leading,
  title,
  meta = [],
  actions,
  menu,
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
  /** A control that always shows, at the end (Restore). */
  trailing?: ReactNode
  /** Opens the Item: the whole row, but for its controls. */
  onOpen?: () => void
  done?: boolean
  /** Its time has gone (an Alert whose alerts have all gone off): faded, as on Plan. */
  past?: boolean
  /** Whether the Item's latest change has reached the server (patterns.md#states). */
  sync?: 'pending' | 'failed'
  className?: string
}) {
  const parts = [...meta]
  if (sync === 'pending')
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
      className={cn(
        'group/row relative flex min-h-14 items-center gap-3 rounded-row bg-card px-3.5 py-2.5 shadow-card',
        past && 'opacity-50 shadow-none',
        className,
      )}
    >
      <div className="relative z-10 flex">{leading}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className={cn('truncate font-semibold', done && 'text-muted-foreground line-through')}>
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              // A line-through doesn't reach into a button, so a done title draws its own.
              className={cn(
                'rounded-[2px] text-left outline-none after:absolute after:inset-0 after:rounded-row focus-visible:after:ring-3 focus-visible:after:ring-ring-soft',
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground tabular-nums">
            {parts.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && <span aria-hidden>·</span>}
                {part}
              </Fragment>
            ))}
          </div>
        )}
      </div>
      {(actions || menu) && (
        <div className="relative z-10 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100 sm:has-[[data-popup-open]]:opacity-100">
          {actions && <div className="hidden items-center gap-1 sm:flex">{actions}</div>}
          {menu}
        </div>
      )}
      {trailing && <div className="relative z-10 flex">{trailing}</div>}
    </div>
  )
}
