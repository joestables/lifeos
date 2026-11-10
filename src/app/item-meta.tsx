import { AlarmClockIcon, BellIcon, RepeatIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AlertTime } from '@/lib/plan'

/** A muted icon and words in a row's meta line (patterns.md#lists-of-items). */
const bit = (Icon: LucideIcon, children: ReactNode, label?: string, key?: number) => (
  <span key={key} className="inline-flex items-center gap-1">
    <Icon className="size-3.5" aria-label={label} aria-hidden={label ? undefined : true} />
    {children}
  </span>
)

/** A Reminder's Alert times on a day: each with a bell, an Alarm's with an alarm clock (RMD-003 1). */
export const alertBits = (alerts: readonly AlertTime[]): ReactNode[] =>
  alerts.map((a) =>
    bit(a.alarm ? AlarmClockIcon : BellIcon, a.time, a.alarm ? 'Alarm' : undefined, a.at),
  )

/** How it repeats, with the repeat icon ("Weekly", "Every 2 weeks"). */
export const repeatBit = (words: string): ReactNode => bit(RepeatIcon, words, 'Repeats')
