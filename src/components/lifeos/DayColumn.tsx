import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A Plan day: day name, number (today in an ink pill), and a lightly filled column. */
export function DayColumn({
  name,
  number,
  today = false,
  children,
}: {
  name: string
  number: number
  today?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline gap-1.5 px-1 pb-1">
        <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {name}
        </span>
        <span
          className={cn(
            'text-day tabular-nums',
            today && 'rounded-md bg-ink px-2 text-ink-foreground',
          )}
        >
          {number}
        </span>
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col gap-1.5 rounded-lg p-1.5',
          today
            ? 'bg-[color-mix(in_oklch,var(--foreground)_5%,transparent)]'
            : 'bg-[color-mix(in_oklch,var(--foreground)_2.5%,transparent)]',
        )}
      >
        {children}
      </div>
    </div>
  )
}
