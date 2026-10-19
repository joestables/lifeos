import { parseNumber, type Amount } from './amounts.ts'
import { unitOf } from './units.ts'

/** A typed line read into its parts (RCP-007 1): an amount, a unit, the rest. */
export interface ParsedLine extends Amount {
  /** The ingredient as typed, capitalised: "Chorizo". */
  name: string
}

const NUMBER = String.raw`(?:\d+\s+\d+/\d+|\d+/\d+|\d*[½⅓⅔¼¾⅛]|\d+(?:[.,]\d+)?|[.,]\d+)`
const AMOUNT = new RegExp(
  String.raw`^(~|about\s+|approx\.?\s+|c\.\s*)?(${NUMBER})(?:\s*(?:-|–|to)\s*(${NUMBER}))?\s*`,
  'i',
)

const capitalise = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/**
 * "200 g chorizo" → 200, g, "Chorizo"; "1-2 tsp honey" → 1 to 2 tsp; "~5 g
 * salt" → approximately 5 g; "2 onions" → 2, no unit; "salt" → no amount.
 * A unit may be written straight after the number ("200g").
 */
export function parseLine(input: string): ParsedLine {
  let rest = input.trim().replace(/\s+/g, ' ')
  const empty: ParsedLine = { qty: null, qtyMax: null, approx: false, unit: null, name: '' }
  const m = AMOUNT.exec(rest)
  if (!m) return { ...empty, name: capitalise(rest) }
  const qty = parseNumber(m[2]!)
  if (qty === null) return { ...empty, name: capitalise(rest) }
  const top = m[3] === undefined ? null : parseNumber(m[3])
  rest = rest.slice(m[0].length)
  const word = /^([a-zA-Z.]+)\b\.?\s*(?:of\s+)?/.exec(rest)
  const unit = word ? unitOf(word[1]!) : undefined
  if (word && unit) rest = rest.slice(word[0].length)
  return {
    qty,
    qtyMax: top !== null && top > qty ? top : null,
    approx: m[1] !== undefined,
    unit: unit ?? null,
    name: capitalise(rest.trim()),
  }
}
