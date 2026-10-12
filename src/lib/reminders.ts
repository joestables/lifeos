import type { Reminder } from '@/data'
import { reminderWhen } from './dates'

const days = (n: number) => (n === 1 ? '1 day' : `${n} days`)

/**
 * What a Reminder hangs on, in words (REM-003): "On the day", "1 day
 * before", "2 days before it's due", "At a set time", or "Snoozed".
 */
export function reminderSays(
  r: Pick<Reminder, 'anchor' | 'offset_days' | 'fixed_at' | 'snoozed_until'>,
  now: Date = new Date(),
): string {
  if (r.snoozed_until && Date.parse(r.snoozed_until) > now.getTime()) return 'Snoozed'
  if (!r.anchor) return 'At a set time'
  const due = r.anchor === 'due_on'
  const n = r.offset_days
  if (n === 0) return due ? 'On the due date' : 'On the day'
  const when = n < 0 ? `${days(-n)} before` : `${days(n)} after`
  return due ? `${when} it's due` : when
}

/** When it fires, as people say it ("Fri 16 Oct 09:00"), once the server has worked it out. */
export const reminderTime = (r: Pick<Reminder, 'fires_at'>, now: Date = new Date()) =>
  r.fires_at ? reminderWhen(r.fires_at, now) : null

/** Reminders soonest first; ones with no time yet last. */
export const byFiring = (a: Pick<Reminder, 'fires_at'>, b: Pick<Reminder, 'fires_at'>) =>
  (a.fires_at ?? '9').localeCompare(b.fires_at ?? '9')
