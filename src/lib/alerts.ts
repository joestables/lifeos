import { addDays } from '@lifeos/recurrence'
import type { AlertAnchor, AlertChoice } from '@/components/lifeos'
import type { ItemRow } from '@/data/types'
import type { Alert, AlertFields } from '@/data'
import { alertWhen, zonedInstant, zonedParts } from './dates'

const days = (n: number) => (n === 1 ? '1 day' : `${n} days`)

/** "30 minutes before", "1 hour before", "At the start" (EVT-003 3). */
export function minutesSays(before: number): string {
  if (before === 0) return 'At the start'
  if (before % 1440 === 0) return `${days(before / 1440)} before`
  if (before % 60 === 0) return before === 60 ? '1 hour before' : `${before / 60} hours before`
  return `${before} minutes before`
}

/**
 * What an Alert hangs on, in words (REM-003): "On the day", "1 day
 * before", "2 days before it's due", "At a set time", or "Snoozed".
 */
export function alertSays(
  r: Pick<Alert, 'anchor' | 'offset_days' | 'fixed_at' | 'snoozed_until'> &
    Partial<Pick<Alert, 'offset_minutes' | 'at_time'>>,
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
export const alertTime = (r: Pick<Alert, 'fires_at'>, now: Date = new Date()) =>
  r.fires_at ? alertWhen(r.fires_at, now) : null

/** Alerts soonest first; ones with no time yet last. */
export const byFiring = (a: Pick<Alert, 'fires_at'>, b: Pick<Alert, 'fires_at'>) =>
  (a.fires_at ?? '9').localeCompare(b.fires_at ?? '9')

/** What an Alert made or changed in its Dialog is saved as (REM-003). */
export function alertFields(choice: AlertChoice, timezone: string): AlertFields {
  return { ...whenFields(choice, timezone), alarm: choice.alarm ?? false }
}

function whenFields(choice: AlertChoice, timezone: string): AlertFields {
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

/** A saved Alert as its Dialog shows it; a set time in my home timezone (ADR-0021). */
export function alertChoice(
  r: Pick<Alert, 'anchor' | 'offset_days' | 'at_time' | 'offset_minutes' | 'fixed_at'> & {
    alarm?: boolean
  },
  fallbackTime: string,
  timezone: string,
): AlertChoice {
  const time = r.at_time?.slice(0, 5) ?? fallbackTime
  const alarm = r.alarm ?? false
  if (!r.anchor) return { kind: 'fixed', ...zonedParts(r.fixed_at!, timezone), alarm }
  if (r.anchor === 'starts_at' && !r.at_time && r.offset_days === 0)
    return { kind: 'before', minutes: -r.offset_minutes, time, alarm }
  return {
    kind: r.anchor as 'do_on' | 'due_on' | 'starts_at',
    daysBefore: -r.offset_days,
    time,
    alarm,
  }
}

/**
 * When an Alert not yet saved will fire, worked out on the device from the
 * dates it hangs on; null while the date it needs is empty.
 */
export function choiceFiresAt(
  choice: AlertChoice,
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

/** The dates an Item's Alerts can hang on: a Task's do-on and due dates, an Event's start. */
export function alertAnchors(
  item: Pick<ItemRow, 'type' | 'do_on' | 'due_on' | 'starts_at' | 'all_day'>,
): AlertAnchor[] {
  if (item.type === 'task')
    return [
      ...(item.do_on ? (['do_on'] as const) : []),
      ...(item.due_on ? (['due_on'] as const) : []),
    ]
  if (item.type === 'event' && item.starts_at)
    return item.all_day ? ['starts_at'] : ['before', 'starts_at']
  return []
}

/** A new Alert's first choice: on the first date it can hang on, else today at my default time. */
export function freshAlert(
  anchors: readonly AlertAnchor[],
  time: string,
  today: string,
): AlertChoice {
  const first = anchors[0]
  if (first === 'before') return { kind: 'before', minutes: 30, time }
  if (first) return { kind: first, daysBefore: 0, time }
  return { kind: 'fixed', day: today, time }
}

/**
 * The default Alert the server gives an Item when it is made (REM-002 1,
 * EVT-003 1), as New task and New event show it before Save: a dated
 * Task's on the day, at its time or my default time; a timed Event's 30
 * minutes before it starts; none with that default off in Settings.
 */
export function defaultAlert(
  item:
    | { type: 'task'; do_on: string | null; do_at: string | null }
    | { type: 'event'; starts_at: string | null; all_day: boolean | null },
  settings: { defaultAlertTime: string; taskAlerts: boolean; eventAlerts: boolean },
): AlertChoice | null {
  if (item.type === 'task')
    return item.do_on && settings.taskAlerts
      ? {
          kind: 'do_on',
          daysBefore: 0,
          time: item.do_at?.slice(0, 5) ?? settings.defaultAlertTime,
        }
      : null
  return item.starts_at && !item.all_day && settings.eventAlerts
    ? { kind: 'before', minutes: 30, time: settings.defaultAlertTime }
    : null
}

/** Whether two Alert choices fire alike: a default opened and saved unchanged is still the default. */
export const sameChoice = (a: AlertChoice, b: AlertChoice) =>
  a.kind === b.kind &&
  (a.alarm ?? false) === (b.alarm ?? false) &&
  (a.kind === 'before'
    ? a.minutes === (b as typeof a).minutes
    : a.kind === 'fixed'
      ? a.day === (b as typeof a).day && a.time === b.time
      : a.daysBefore === (b as typeof a).daysBefore && a.time === b.time)
