import { CloudAlertIcon, CloudIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Any list of Items: tile or checkbox, title and meta, then actions that
 * appear on hover and focus (always on a phone).
 */
export function ItemRow({
  leading,
  title,
  meta = [],
  actions,
  trailing,
  done = false,
  sync,
  className,
}: {
  leading: ReactNode
  title: ReactNode
  /** Parts of the meta line, joined with "·". */
  meta?: ReactNode[]
  actions?: ReactNode
  /** A control that always shows, at the end (Restore). */
  trailing?: ReactNode
  done?: boolean
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
        className,
      )}
    >
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className={cn('truncate font-semibold', done && 'text-muted-foreground line-through')}>
          {title}
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
      {actions && (
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
          {actions}
        </div>
      )}
      {trailing}
    </div>
  )
}
