import type { AddChoice } from '@/components/lifeos'
import { plannedTypes } from '@/lib/item-types'

/** A day's "+" (PLN-006): every Schedulable Type, on Week and Today alike (TDY-004 4). */
export const ADD_CHOICES: AddChoice[] = plannedTypes().map((t) => ({
  key: t.key,
  label: t.label,
  colour: t.colour as AddChoice['colour'],
  icon: t.icon,
}))
