import type { LineAlert } from '@lifeos/capture'
import { addDays } from '@lifeos/recurrence'
import { fromIsoDay, isoDayOf, shortDate } from './dates'

/** An Alert in "New": a local day and time, an Alarm or not. */
export interface NewAlert {
  day: string
  time: string
  alarm: boolean
}

/** A pill's words (NEW-004 1): "Today 18:00", "Tomorrow 07:00", "Tue 10 Nov, 20:00". */
export function pillLabel(a: Pick<NewAlert, 'day' | 'time'>, now: Date): string {
  const today = isoDayOf(now)
  if (a.day === today) return `Today ${a.time}`
  if (a.day === addDays(today, 1)) return `Tomorrow ${a.time}`
  return `${shortDate(fromIsoDay(a.day))}, ${a.time}`
}

/** The same moment, said once: "tapping it again adds nothing new" (NEW-005 2). */
export const sameAlert = (a: Pick<NewAlert, 'day' | 'time'>, b: Pick<NewAlert, 'day' | 'time'>) =>
  a.day === b.day && a.time === b.time

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** A quick time: its name, when it is, and how a menu says when ("15:20", "Tue 09:00"). */
export interface QuickTime {
  key: 'hour' | 'evening' | 'morning' | 'weekend'
  label: string
  alert: Pick<NewAlert, 'day' | 'time'>
  when: string
}

/**
 * The quick times for a moment (NEW-005): In 1 hour; This evening (18:00)
 * until 18:00; Tomorrow morning (my default time); This weekend (Saturday at
 * my default time, the next one still to come). `now` is the device's time.
 */
export function quickTimes(now: Date, defaultTime: string): QuickTime[] {
  const today = isoDayOf(now)
  const hour = new Date(now.getTime() + 3_600_000)
  const short = (day: string) => shortDate(fromIsoDay(day)).slice(0, 3)
  const out: QuickTime[] = [
    {
      key: 'hour',
      label: 'In 1 hour',
      alert: { day: isoDayOf(hour), time: clock(hour) },
      when: clock(hour),
    },
  ]
  if (clock(now) < '18:00')
    out.push({
      key: 'evening',
      label: 'This evening',
      alert: { day: today, time: '18:00' },
      when: '18:00',
    })
  const tomorrow = addDays(today, 1)
  out.push({
    key: 'morning',
    label: 'Tomorrow morning',
    alert: { day: tomorrow, time: defaultTime },
    when: `${short(tomorrow)} ${defaultTime}`,
  })
  let saturday = addDays(today, (6 - now.getDay() + 7) % 7)
  if (saturday === today && clock(now) >= defaultTime) saturday = addDays(saturday, 7)
  out.push({
    key: 'weekend',
    label: 'This weekend',
    alert: { day: saturday, time: defaultTime },
    when: `${short(saturday)} ${defaultTime}`,
  })
  return out
}

/** The likeliest next time, beside In 1 hour (NEW-005 1): This evening before 17:00, else Tomorrow morning. */
export const likeliest = (times: readonly QuickTime[], now: Date): QuickTime =>
  times.find((t) => t.key === (clock(now) < '17:00' ? 'evening' : 'morning')) ??
  times.find((t) => t.key === 'morning')!

const JOINER = /^(and|&|,|at|on|by|in|every|from|\d)/i

/**
 * Whether the words typed for an Alert are done: a whole word that isn't
 * part of a time follows them ("tue 8pm with"), so they can leave the line
 * for their pill; "tue 8pm and" waits for the time after it.
 */
export function settled(line: string, alert: Pick<LineAlert, 'to'>): boolean {
  const next = /^\s*(\S+)\s/.exec(line.slice(alert.to))
  return !!next && !JOINER.test(next[1]!)
}

/** The line without the words of these Alerts, the rest as typed. */
export function withoutWords(line: string, alerts: readonly Pick<LineAlert, 'from' | 'to'>[]) {
  let out = line
  for (const a of [...alerts].sort((x, y) => y.from - x.from)) {
    const before = out.slice(0, a.from).replace(/\s+$/, '')
    const after = out.slice(a.to).replace(/^\s+/, '')
    out = before && after ? `${before} ${after}` : before + (after ? after : ' ')
  }
  return out.replace(/^\s+/, '')
}
