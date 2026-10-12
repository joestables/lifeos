import { makeDay, parts, type Day } from './days.ts'

/**
 * The RFC 5545 RRULE subset LifeOS makes (TSK-008), stored without DTSTART
 * ("FREQ=WEEKLY;BYDAY=MO"); the series' starts_on is its start.
 */
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** iCal's weekday codes, Monday first. */
export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface Rule {
  frequency: Frequency
  /** Every this many days, weeks, months or years. */
  interval: number
  /** Weekly: on these days. Monthly: one day, with nth ("first Saturday", -1 for the last). */
  byDay: { day: Weekday; nth?: number }[]
  /** Monthly: on this date of the month (-1 for the last day). */
  byMonthDay?: number
  /** Ends after this many occurrences. */
  count?: number
  /** Ends on this day, inclusive. */
  until?: Day
}

/** Reads a rule; a part it doesn't know is refused, so nothing is silently dropped. */
export function parseRule(text: string): Rule {
  const fields = new Map<string, string>()
  for (const part of text.split(';')) {
    const [key, value] = part.split('=')
    if (!key || value === undefined) throw new Error(`Not a repeat rule: ${text}`)
    fields.set(key.toUpperCase(), value.toUpperCase())
  }
  const frequency = fields.get('FREQ')?.toLowerCase()
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency ?? ''))
    throw new Error(`Not a repeat rule: ${text}`)
  for (const key of fields.keys())
    if (!['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL', 'WKST'].includes(key))
      throw new Error(`Unknown part of a repeat rule: ${key}`)

  const byDay = (fields.get('BYDAY') ?? '')
    .split(',')
    .filter(Boolean)
    .map((code) => {
      const m = code.match(/^([+-]?\d)?(MO|TU|WE|TH|FR|SA|SU)$/)
      if (!m) throw new Error(`Not a weekday: ${code}`)
      return m[1] ? { day: m[2] as Weekday, nth: Number(m[1]) } : { day: m[2] as Weekday }
    })
  const rule: Rule = {
    frequency: frequency as Frequency,
    interval: Math.max(1, Number(fields.get('INTERVAL') ?? 1) || 1),
    byDay,
  }
  if (fields.has('BYMONTHDAY')) rule.byMonthDay = Number(fields.get('BYMONTHDAY'))
  if (fields.has('COUNT')) rule.count = Math.max(1, Number(fields.get('COUNT')) || 1)
  const until = fields.get('UNTIL')
  if (until) {
    const day = makeDay(
      Number(until.slice(0, 4)),
      Number(until.slice(4, 6)),
      Number(until.slice(6, 8)),
    )
    if (!day) throw new Error(`Not a date: ${until}`)
    rule.until = day
  }
  return rule
}

/** Writes a rule the way parseRule reads it, weekdays Monday first. */
export function formatRule(rule: Rule): string {
  const out = [`FREQ=${rule.frequency.toUpperCase()}`]
  if (rule.interval > 1) out.push(`INTERVAL=${rule.interval}`)
  if (rule.byDay.length > 0) {
    const days = [...rule.byDay].sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
    out.push(`BYDAY=${days.map((d) => `${d.nth ?? ''}${d.day}`).join(',')}`)
  }
  if (rule.byMonthDay !== undefined) out.push(`BYMONTHDAY=${rule.byMonthDay}`)
  if (rule.count !== undefined) out.push(`COUNT=${rule.count}`)
  else if (rule.until) out.push(`UNTIL=${rule.until.replaceAll('-', '')}`)
  return out.join(';')
}

const asRule = (rule: Rule | string) => (typeof rule === 'string' ? parseRule(rule) : rule)

const DAY_NAMES: Record<Weekday, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
}
const LONG_DAY: Record<Weekday, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
}
const NTH: Record<string, string> = {
  '1': 'first',
  '2': 'second',
  '3': 'third',
  '4': 'fourth',
  '5': 'fifth',
  '-1': 'last',
}
// As the app says dates (en-GB): "Sept".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
const UNIT: Record<Frequency, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}
const WORKDAYS = 'MO,TU,WE,TH,FR'

const every = (rule: Rule) =>
  rule.interval > 1 ? `Every ${rule.interval} ${UNIT[rule.frequency]}s` : null

/** "the second Saturday", "day 12", "the last day". */
export function monthlyOn(rule: Rule, startsOn: Day): string {
  const nth = rule.byDay.find((d) => d.nth !== undefined)
  if (nth) return `the ${NTH[String(nth.nth)]} ${LONG_DAY[nth.day]}`
  const date = rule.byMonthDay ?? parts(startsOn).date
  return date === -1 ? 'the last day' : `day ${date}`
}

/**
 * The whole repeat in words, for the Task and the Recurring view: "Every
 * Monday", "Every weekday", "Monthly on the first Saturday", "3 months after
 * it's done", with its end ("until 5 Jan 2029", "10 times").
 */
export function describeRule(
  input: Rule | string,
  startsOn: Day,
  mode: 'schedule' | 'after_completion' = 'schedule',
): string {
  const rule = asRule(input)
  let text: string
  if (mode === 'after_completion') {
    const n = rule.interval
    text = `${n} ${UNIT[rule.frequency]}${n > 1 ? 's' : ''} after it's done`
  } else if (rule.frequency === 'daily') {
    text = every(rule) ?? 'Every day'
  } else if (rule.frequency === 'weekly') {
    const days = rule.byDay.length > 0 ? rule.byDay.map((d) => d.day) : []
    const codes = [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)).join(',')
    if (rule.interval === 1 && codes === WORKDAYS) text = 'Every weekday'
    else if (rule.interval === 1 && days.length === 1) text = `Every ${LONG_DAY[days[0]!]}`
    else if (days.length === 0) text = every(rule) ?? 'Every week'
    else
      text = `${every(rule) ?? 'Weekly'} on ${[...days]
        .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
        .map((d) => DAY_NAMES[d])
        .join(', ')}`
  } else if (rule.frequency === 'monthly') {
    text = `${every(rule) ?? 'Monthly'} on ${monthlyOn(rule, startsOn)}`
  } else {
    const { month, date } = parts(startsOn)
    text = `${every(rule) ?? 'Yearly'} on ${date} ${MONTHS[month - 1]}`
  }
  if (rule.count !== undefined) text += `, ${rule.count} times`
  else if (rule.until) {
    // With the year: an end is the one date routinely years out (v1's bug).
    const { year, month, date } = parts(rule.until)
    text += `, until ${date} ${MONTHS[month - 1]} ${year}`
  }
  return text
}

/** A word or two for a Task's row: "Daily", "Weekdays", "Weekly", "Every 2 weeks". */
export function shortRule(
  input: Rule | string,
  mode: 'schedule' | 'after_completion' = 'schedule',
): string {
  const rule = asRule(input)
  if (mode === 'after_completion')
    return `${rule.interval} ${UNIT[rule.frequency]}${rule.interval > 1 ? 's' : ''} after`
  if (
    rule.frequency === 'weekly' &&
    rule.interval === 1 &&
    rule.byDay
      .map((d) => d.day)
      .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
      .join(',') === WORKDAYS
  )
    return 'Weekdays'
  return (
    every(rule) ??
    { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[rule.frequency]
  )
}
