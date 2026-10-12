/**
 * Calendar days as "YYYY-MM-DD". A repeat is worked out in days, not
 * instants: an occurrence's day and its time are local to the series'
 * timezone, so the clocks changing can't move it (ADR-0022).
 */
export type Day = string

const MS_PER_DAY = 86_400_000

/** Day number since 1970-01-01, the same wherever the code runs. */
export const toNumber = (day: Day): number => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

export const fromNumber = (n: number): Day => new Date(n * MS_PER_DAY).toISOString().slice(0, 10)

export const addDays = (day: Day, n: number): Day => fromNumber(toNumber(day) + n)

/** The day from a year, a month (1–12) and a day of the month, or null if the month has no such day. */
export function makeDay(year: number, month: number, date: number): Day | null {
  const t = new Date(Date.UTC(year, month - 1, date))
  if (t.getUTCMonth() !== (((month - 1) % 12) + 12) % 12 || t.getUTCDate() !== date) return null
  return t.toISOString().slice(0, 10)
}

export const parts = (day: Day) => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  return { year, month, date }
}

/** 0 for Monday to 6 for Sunday. */
export const weekdayOf = (day: Day): number =>
  (new Date(toNumber(day) * MS_PER_DAY).getUTCDay() + 6) % 7

export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

/** The day it is now in a timezone ("Europe/London"). */
export function todayIn(timezone: string, now: Date = new Date()): Day {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
