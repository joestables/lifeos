const DAY = 24 * 60 * 60 * 1000

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** "Fri 9 Oct" (patterns.md#copy). */
export function shortDate(d: Date): string {
  return `${weekday.format(d)} ${dayMonth.format(d)}`
}

/**
 * When something happened, as Recently deleted says it: "Just now",
 * "10 min ago", "Today 14:05", "Yesterday", or "Thu 8 Oct".
 */
export function whenAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / DAY)
  if (days === 0) return `Today ${time.format(then)}`
  if (days === 1) return 'Yesterday'
  return shortDate(then)
}

/** "2026-10-16" as a local date. */
export const fromIsoDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d)
}

/**
 * A day as capture says it: "Today", "Tomorrow", "Fri" in the coming week,
 * else "Fri 23 Oct" (patterns.md#copy).
 */
export function dayName(day: string, now: Date = new Date()): string {
  const date = fromIsoDay(day)
  const days = Math.round((date.getTime() - startOfDay(now).getTime()) / DAY)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1 && days < 7) return weekday.format(date)
  return shortDate(date)
}

/** The instant a wall-clock time on a day is in a timezone: "2026-10-16", "18:00", "Europe/London". */
export function zonedInstant(day: string, at: string, timeZone: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const [h, min] = at.split(':').map(Number)
  const wall = Date.UTC(y!, m! - 1, d, h, min)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  const offset = (t: number) => {
    const all = parts.formatToParts(t)
    const p = (type: string) => Number(all.find((x) => x.type === type)?.value)
    return Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute')) - t
  }
  const first = wall - offset(wall)
  return new Date(wall - offset(first)).toISOString()
}

const daysFrom = (now: Date, day: string) =>
  Math.round((fromIsoDay(day).getTime() - startOfDay(now).getTime()) / DAY)

/** When a Thought was captured: "08:12" today, "Yesterday", "Thu" this week, else "Fri 9 Oct" (INB-001). */
export function capturedWhen(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / DAY)
  if (days <= 0) return time.format(then)
  if (days === 1) return 'Yesterday'
  if (days < 7) return weekday.format(then)
  return shortDate(then)
}

/** A due date: "Due today", "Due yesterday", "Due tomorrow", else "Due Thu 8 Oct". */
export function dueWhen(day: string, now: Date = new Date()): string {
  const days = daysFrom(now, day)
  if (days === 0) return 'Due today'
  if (days === -1) return 'Due yesterday'
  if (days === 1) return 'Due tomorrow'
  return `Due ${shortDate(fromIsoDay(day))}`
}

/** When a Task was done: "Completed today", "Completed yesterday", else "Completed Sun 4 Oct". */
export function doneWhen(iso: string, now: Date = new Date()): string {
  const days = daysFrom(now, isoDayOf(new Date(iso)))
  if (days === 0) return 'Completed today'
  if (days === -1) return 'Completed yesterday'
  return `Completed ${shortDate(new Date(iso))}`
}

/** A do-on date already past, as Inbox's Today shows it: "Since yesterday", "Since Thu", "Since Fri 2 Oct". */
export function sinceWhen(day: string, now: Date = new Date()): string {
  const days = daysFrom(now, day)
  if (days === -1) return 'Since yesterday'
  if (days > -7) return `Since ${weekday.format(fromIsoDay(day))}`
  return `Since ${shortDate(fromIsoDay(day))}`
}

/** A moment in the future, as an Alert says it: "Today 15:00", "Tue 15:00", "Fri 23 Oct 09:00". */
export function alertWhen(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  return `${dayName(isoDayOf(at), now)} ${time.format(at)}`
}

/** A local Date as "2026-10-16". */
export const isoDayOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** A date in a field: "Today", "Tomorrow", "Yesterday", else "Fri 16 Oct". */
export function dateName(day: string, now: Date = new Date()): string {
  const days = daysFrom(now, day)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return shortDate(fromIsoDay(day))
}

/** A moment as a day and a time on the clock in a timezone: "2026-10-16", "18:00". */
export function zonedParts(iso: string, timeZone: string): { day: string; time: string } {
  const all = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso))
  const p = (type: string) => all.find((x) => x.type === type)?.value ?? ''
  return { day: `${p('year')}-${p('month')}-${p('day')}`, time: `${p('hour')}:${p('minute')}` }
}

/** When an invitation was sent: "Invited today", "Invited yesterday", "Invited Thu" this week, else "Invited Fri 9 Oct" (HSH-002). */
export function invitedWhen(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / DAY)
  if (days <= 0) return 'Invited today'
  if (days === 1) return 'Invited yesterday'
  if (days < 7) return `Invited ${weekday.format(then)}`
  return `Invited ${shortDate(then)}`
}
