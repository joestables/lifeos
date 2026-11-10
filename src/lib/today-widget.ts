import { addDays } from '@lifeos/recurrence'
import type { Item } from '@/data'
import { itemTitle, typeLook } from './item-types'
import { cardLine, planDays, type AlertTime, type Placed } from './plan'

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
    // A Reminder fades once its last Alert of the day has gone off (RMD-003 2).
    ends: p.alerts ? new Date(p.alerts.at(-1)!.at).toISOString() : p.item.ends_at,
  }
}

/** Today's and tomorrow's cards in Plan's order, so the widget turns at midnight with nothing to fetch. */
export function widgetDays(
  items: readonly Item[],
  today: string,
  timezone: string,
  hidden: readonly string[],
  alertsOf?: (item: Item) => AlertTime[],
): WidgetDay[] {
  const days = planDays(items, today, addDays(today, 1), timezone, hidden, alertsOf)
  return [...days].map(([day, list]) => ({
    day,
    cards: list.map((p) => widgetCard(p, day, timezone)),
  }))
}
