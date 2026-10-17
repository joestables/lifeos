import { CalendarSyncIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Where an Event comes from (components.md#eventdetails): a muted line with
 * `calendar-sync`, "Google Calendar · Family · Incoming".
 */
export function EventSource({ calendar, level }: { calendar: string; level: string }) {
  return (
    <div className="-mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
      <CalendarSyncIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">
        Google Calendar · {calendar} · {level}
      </span>
    </div>
  )
}

/**
 * An Event's fact that can't be changed here (GCL-004): a muted 16px icon,
 * then its date and time, place or notes, as a line rather than a field.
 */
export function EventFact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-start gap-3 py-1.5 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
      {icon}
      <div className="min-w-0 flex-1 break-words whitespace-pre-wrap">{children}</div>
    </div>
  )
}
