import { GB, type ParsedResult } from 'chrono-node/en'

/** What a captured line says about when (CAP-003). Dates are local, "2026-10-16"; times "18:00". */
export interface CaptureDates {
  doOn?: string
  doAt?: string
  dueOn?: string
  /** The line without its date words, first letter capitalised: a Task's title. */
  title: string
}

/** Ordinary words that are also dates: one counts only next to a number or after "on". */
const AMBIGUOUS = new Set(['may', 'sun', 'sat', 'march', 'mar', 'second'])

/** Words that make the date after them a deadline. */
const DEADLINE = /\b(due|by)\s+$/i

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** The day a result means, by the rules chrono doesn't follow. */
function dayOf(r: ParsedResult, now: Date): Date {
  const text = r.text.toLowerCase()
  const start = r.start
  if (/\bnext week\b/.test(text)) {
    // Next Monday.
    return addDays(now, (1 - now.getDay() + 7) % 7 || 7)
  }
  const weekday = start.get('weekday')
  if (start.isCertain('weekday') && !start.isCertain('day') && weekday !== null) {
    // The coming one, today included.
    return addDays(now, (weekday - now.getDay() + 7) % 7)
  }
  const date = start.date()
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** The time a result says, if it says one: "at 5" is 17:00, "18:00" stays. */
function timeOf(r: ParsedResult): { hour: number; minute: number } | undefined {
  const start = r.start
  if (!start.isCertain('hour')) return undefined
  let hour = start.get('hour') ?? 0
  const minute = start.get('minute') ?? 0
  const saidMeridiem = start.isCertain('meridiem')
  // "07:30" is a 24-hour clock; "6:30" and "at 6" are the evening.
  const clockStyle = /(^|\D)\d\d[:.]\d\d/.test(r.text)
  if (!saidMeridiem && !clockStyle && hour >= 1 && hour <= 7) hour += 12
  return { hour, minute }
}

function counts(r: ParsedResult): boolean {
  const words = r.text.toLowerCase().trim()
  if (/\d/.test(words)) return true
  if (words.startsWith('on ')) return true
  return !AMBIGUOUS.has(words)
}

/** Capitalises the first letter and tidies what removing the date words left. */
function tidy(text: string): string {
  const t = text
    .replace(/\s+([?!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|\s)(at|on|due|by)\s*$/i, '')
    .trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Reads the dates in a captured line, deterministically and with no signal
 * (ADR-0027). A bare date is the day to do it; "due" or "by" makes it the
 * deadline (ADR-0022). `now` is the device's time.
 */
export function parseCapture(line: string, now: Date = new Date()): CaptureDates {
  const results = GB.parse(line, now, { forwardDate: true }).filter(counts)
  const out: CaptureDates = { title: '' }
  const cut: [number, number][] = []

  for (const r of results) {
    let from = r.index
    const before = line.slice(0, from)
    const deadline = DEADLINE.exec(before)
    const day = dayOf(r, now)
    const time = timeOf(r)

    if (deadline) {
      if (out.dueOn) continue
      out.dueOn = isoDay(day)
      from -= deadline[0].length
    } else {
      if (out.doOn) continue
      let doDay = day
      if (time && !r.start.isCertain('day') && !r.start.isCertain('weekday')) {
        // A time with no date: today, or tomorrow if it has passed.
        const passed = time.hour * 60 + time.minute <= now.getHours() * 60 + now.getMinutes()
        doDay = addDays(now, passed ? 1 : 0)
      }
      out.doOn = isoDay(doDay)
      if (time) out.doAt = `${pad(time.hour)}:${pad(time.minute)}`
    }
    cut.push([from, r.index + r.text.length])
  }

  let title = line
  for (const [from, to] of cut.sort((a, b) => b[0] - a[0])) {
    title = `${title.slice(0, from)} ${title.slice(to)}`
  }
  out.title = tidy(title)
  return out
}
