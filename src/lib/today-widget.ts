import { addDays } from '@lifeos/recurrence'
import type { Item } from '@/data'
import { itemTitle, plannedTypes, typeLook } from './item-types'
import { cardLine, planDays, type Placed } from './plan'

/**
 * A card on the Today widget (WID-002, ADR-0064), as the phone keeps it:
 * what Plan's card says, without its detail. `core.device_plan` answers the
 * same shape.
 */
export interface WidgetCard {
  id: string
  type: string
  colour: string
  title: string
  /** "09:00", "All day", "Until 15:00", "Dinner"; null for an untimed Item. */
  time: string | null
  done: boolean
  /** When an Event ends, so the widget fades it once it has (PLN-001 6). */
  ends: string | null
}

export interface WidgetDay {
  day: string
  cards: WidgetCard[]
}

export function widgetCard(p: Placed, day: string, timezone: string): WidgetCard {
  const look = typeLook(p.item.type)
  return {
    id: p.item.id,
    type: p.item.type,
    colour: look.colour,
    title: itemTitle(p.item),
    time: cardLine(p, day, timezone).time ?? null,
    done: p.item.status === 'done',
    ends: p.item.ends_at,
  }
}

/** Today's and tomorrow's cards in Plan's order, so the widget turns at midnight with nothing to fetch. */
export function widgetDays(
  items: readonly Item[],
  today: string,
  timezone: string,
  hidden: readonly string[],
): WidgetDay[] {
  const days = planDays(items, today, addDays(today, 1), timezone, hidden)
  return [...days].map(([day, list]) => ({
    day,
    cards: list.map((p) => widgetCard(p, day, timezone)),
  }))
}

/** A Type in the widget's Add list, as Plan's "+" offers it (WID-002 8). */
export interface WidgetChoice {
  key: string
  label: string
  colour: string
}

export const widgetChoices = (): WidgetChoice[] =>
  plannedTypes().map((t) => ({ key: t.key, label: t.label, colour: t.colour }))
