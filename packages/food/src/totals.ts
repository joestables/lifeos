import { formatAmount, inBase, type Amount } from './amounts.ts'
import type { Kind, Unit } from './units.ts'

/**
 * A shopping list's total of one ingredient (ADR-0053): units of one kind
 * add up (500 g + 1 kg = 1.5 kg; ml, l, tsp, tbsp and cup together),
 * shown in the unit they share, else in g or ml, and in kg or l from 1000;
 * weight, volume and counts sit side by side; a range counts as its top;
 * "~" carries into its part; an unmeasured line on top of a measured one
 * shows "+" ("Salt 5 g +"). Nothing measured gives "".
 */
export function total(amounts: readonly Amount[]): string {
  const kinds = new Map<Kind, { value: number; units: Set<Unit>; approx: boolean }>()
  const count = { value: 0, approx: false, any: false }
  let unmeasured = false
  for (const a of amounts) {
    if (a.qty === null) {
      unmeasured = true
      continue
    }
    const base = inBase(a)
    if (!base) {
      count.value += a.qtyMax ?? a.qty
      count.approx ||= a.approx
      count.any = true
      continue
    }
    const k = kinds.get(base.kind) ?? { value: 0, units: new Set<Unit>(), approx: false }
    k.value += base.value
    k.units.add(a.unit!)
    k.approx ||= a.approx
    kinds.set(base.kind, k)
  }
  const parts: string[] = []
  if (count.any)
    parts.push(formatAmount({ qty: count.value, qtyMax: null, approx: count.approx, unit: null }))
  for (const kind of ['weight', 'volume'] as const) {
    const k = kinds.get(kind)
    if (!k) continue
    const only = k.units.size === 1 ? [...k.units][0]! : null
    const small = kind === 'weight' ? 'g' : 'ml'
    const big = kind === 'weight' ? 'kg' : 'l'
    const unit: Unit = only && only !== small && only !== big ? only : k.value >= 1000 ? big : small
    const per = { g: 1, kg: 1000, ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 250 }[unit]
    parts.push(formatAmount({ qty: k.value / per, qtyMax: null, approx: k.approx, unit }))
  }
  if (!parts.length) return ''
  return parts.join(' + ') + (unmeasured ? ' +' : '')
}
