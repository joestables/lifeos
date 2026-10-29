import { FACTORS, type Unit } from './units.ts'

/**
 * An amount as typed (ADR-0053): a number, the top of a range ("1–2"), and
 * whether it was approximate ("~5"). Nothing is converted when kept.
 */
export interface Amount {
  qty: number | null
  qtyMax: number | null
  approx: boolean
  unit: Unit | null
}

const FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
}

/** "2", "1.5", "1,5", "½", "1½", "1 1/2", "3/4" → a number. */
export function parseNumber(text: string): number | null {
  const s = text.trim().replace(',', '.')
  if (!s) return null
  const mixed = /^(\d+)?\s*([½⅓⅔¼¾⅛])$/.exec(s)
  if (mixed) return Number(mixed[1] ?? 0) + FRACTIONS[mixed[2]!]!
  const slash = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(s)
  if (slash) {
    const den = Number(slash[3])
    if (!den) return null
    return Number(slash[1] ?? 0) + Number(slash[2]) / den
  }
  if (/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return Number(s)
  return null
}

/** Scales an amount to other servings: both ends of a range. */
export function scale(amount: Amount, factor: number): Amount {
  if (amount.qty === null || factor === 1) return amount
  return {
    ...amount,
    qty: amount.qty * factor,
    qtyMax: amount.qtyMax === null ? null : amount.qtyMax * factor,
  }
}

/**
 * Display rounding (ADR-0053): whole grams and millilitres up to 100, then
 * to 5; kg and l to two decimals; spoons and cups to quarters; counts to halves;
 * never rounded to nothing.
 */
export function roundFor(unit: Unit | null, n: number): number {
  if (n <= 0) return 0
  let r: number
  if (unit === 'g' || unit === 'ml') r = n < 100 ? Math.round(n) : Math.round(n / 5) * 5
  else if (unit === 'kg' || unit === 'l') r = Math.round(n * 100) / 100
  else if (unit === 'tsp' || unit === 'tbsp' || unit === 'cup') r = Math.round(n * 4) / 4
  else r = Math.round(n * 2) / 2
  if (r > 0) return r
  // Never rounded to nothing: the smallest step of its kind.
  if (unit === 'g' || unit === 'ml') return 1
  if (unit === 'kg' || unit === 'l') return 0.01
  if (unit === 'tsp' || unit === 'tbsp' || unit === 'cup') return 0.25
  return 0.5
}

/** Always decimal (Joe, 23 October): 1.5, 0.75, never "1½". */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/** "200 g", "1–2 tbsp", "~5 g", "2", or "" with no amount. */
export function formatAmount(amount: Amount): string {
  if (amount.qty === null) return ''
  const lo = formatNumber(roundFor(amount.unit, amount.qty))
  const hi = amount.qtyMax === null ? '' : `–${formatNumber(roundFor(amount.unit, amount.qtyMax))}`
  return `${amount.approx ? '~' : ''}${lo}${hi}${amount.unit ? ` ${amount.unit}` : ''}`
}

/** An amount in its kind's base unit (g or ml), the top of a range counting. */
export function inBase(amount: Amount): { kind: 'weight' | 'volume'; value: number } | null {
  if (amount.qty === null || amount.unit === null) return null
  const f = FACTORS[amount.unit]
  return { kind: f.kind, value: (amount.qtyMax ?? amount.qty) * f.base }
}
