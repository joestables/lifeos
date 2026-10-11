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
