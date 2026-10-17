import { addDays } from '@lifeos/recurrence'
import type { ReminderAnchor, ReminderChoice } from '@/components/lifeos'
import type { ItemRow } from '@/data/types'
import type { Reminder, ReminderFields } from '@/data'
import { reminderWhen, zonedInstant, zonedParts } from './dates'

const days = (n: number) => (n === 1 ? '1 day' : `${n} days`)

/** "30 minutes before", "1 hour before", "At the start" (EVT-003 3). */
export function minutesSays(before: number): string {
  if (before === 0) return 'At the start'
  if (before % 1440 === 0) return `${days(before / 1440)} before`
  if (before % 60 === 0) return before === 60 ? '1 hour before' : `${before / 60} hours before`
  return `${before} minutes before`
}

/**
 * What a Reminder hangs on, in words (REM-003): "On the day", "1 day
 * before", "2 days before it's due", "At a set time", or "Snoozed".
 */
export function reminderSays(
  r: Pick<Reminder, 'anchor' | 'offset_days' | 'fixed_at' | 'snoozed_until'> &
    Partial<Pick<Reminder, 'offset_minutes' | 'at_time'>>,
  now: Date = new Date(),
): string {
  if (r.snoozed_until && Date.parse(r.snoozed_until) > now.getTime()) return 'Snoozed'
  if (!r.anchor) return 'At a set time'
  if (r.anchor === 'starts_at' && !r.at_time && r.offset_days === 0)
    return minutesSays(-(r.offset_minutes ?? 0))
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

/** What a Reminder made or changed in its Dialog is saved as (REM-003). */
export function reminderFields(choice: ReminderChoice, timezone: string): ReminderFields {
  if (choice.kind === 'fixed')
    return {
      anchor: null,
      offset_days: 0,
      at_time: null,
      offset_minutes: 0,
      fixed_at: zonedInstant(choice.day!, choice.time, timezone),
    }
  if (choice.kind === 'before')
    return {
      anchor: 'starts_at',
      offset_days: 0,
      at_time: null,
      offset_minutes: -choice.minutes,
      fixed_at: null,
    }
  return {
    anchor: choice.kind,
    offset_days: -choice.daysBefore,
    at_time: choice.time,
    offset_minutes: 0,
    fixed_at: null,
  }
}

/** A saved Reminder as its Dialog shows it; a set time in my home timezone (ADR-0021). */
export function reminderChoice(
  r: Pick<Reminder, 'anchor' | 'offset_days' | 'at_time' | 'offset_minutes' | 'fixed_at'>,
  fallbackTime: string,
  timezone: string,
): ReminderChoice {
  const time = r.at_time?.slice(0, 5) ?? fallbackTime
  if (!r.anchor) return { kind: 'fixed', ...zonedParts(r.fixed_at!, timezone) }
  if (r.anchor === 'starts_at' && !r.at_time && r.offset_days === 0)
    return { kind: 'before', minutes: -r.offset_minutes, time }
  return { kind: r.anchor as 'do_on' | 'due_on' | 'starts_at', daysBefore: -r.offset_days, time }
}

/**
 * When a Reminder not yet saved will fire, worked out on the device from the
 * dates it hangs on; null while the date it needs is empty.
 */
export function choiceFiresAt(
  choice: ReminderChoice,
  dates: {
    do_on?: string | null
    due_on?: string | null
    starts_at?: string | null
    start_day?: string | null
  },
  timezone: string,
): string | null {
  if (choice.kind === 'fixed')
    return choice.day ? zonedInstant(choice.day, choice.time, timezone) : null
  if (choice.kind === 'before')
    return dates.starts_at
      ? new Date(Date.parse(dates.starts_at) - choice.minutes * 60_000).toISOString()
      : null
  const day = choice.kind === 'starts_at' ? dates.start_day : dates[choice.kind]
  return day ? zonedInstant(addDays(day, -choice.daysBefore), choice.time, timezone) : null
}

/** The dates an Item's Reminders can hang on: a Task's do-on and due dates, an Event's start. */
export function reminderAnchors(
  item: Pick<ItemRow, 'type' | 'do_on' | 'due_on' | 'starts_at' | 'all_day'>,
): ReminderAnchor[] {
  if (item.type === 'task')
    return [
      ...(item.do_on ? (['do_on'] as const) : []),
      ...(item.due_on ? (['due_on'] as const) : []),
    ]
  if (item.type === 'event' && item.starts_at)
    return item.all_day ? ['starts_at'] : ['before', 'starts_at']
  return []
}

/** A new Reminder's first choice: on the first date it can hang on, else today at my default time. */
export function freshReminder(
  anchors: readonly ReminderAnchor[],
  time: string,
  today: string,
): ReminderChoice {
  const first = anchors[0]
  if (first === 'before') return { kind: 'before', minutes: 30, time }
  if (first) return { kind: first, daysBefore: 0, time }
  return { kind: 'fixed', day: today, time }
}
