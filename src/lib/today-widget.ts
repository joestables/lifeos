import { addDays } from '@lifeos/recurrence'
import type { Item } from '@/data'
import { zonedInstant } from './dates'
import { itemTitle, typeLook } from './item-types'
import { cardLine, type AlertTime } from './plan'
import { DAY_PARTS, todayList, type OnToday } from './today'

/**
 * A card on the Today widget (WID-002, TDY-006, ADR-0064), as the phone
 * keeps it: what Today says, without its detail. `core.device_plan`
 * answers the same shape.
 */
export interface WidgetCard {
  id: string
  type: string
  colour: string
  title: string
  /** "09:00", "All day", "Until 15:00", "Dinner", "Overdue"; null for an untimed Item. */
  time: string | null
  done: boolean
  /** When it has gone by, so the widget fades it: an Event's end, a Reminder's last Alert that day, a Meal's part of the day. */
  ends: string | null
}

export interface WidgetDay {
  day: string
  cards: WidgetCard[]
}

const base = (item: Item) => ({
  id: item.id,
  type: item.type,
  colour: typeLook(item.type).colour,
  title: itemTitle(item),
})

/** An Item on Today as a card on the widget (TDY-006 1). */
export function widgetCard(on: OnToday, day: string, timezone: string): WidgetCard {
  const { placed } = on
  const { item } = placed
  const until = DAY_PARTS.find((d) => d.key === on.part)!.until
  return {
    ...base(item),
    // A Reminder at its first time that day.
    time: placed.alerts ? placed.alerts[0]!.time : (cardLine(placed, day, timezone).time ?? null),
    done: item.status === 'done',
    ends: placed.alerts
      ? // It fades once its last Alert of the day has gone off (RMD-003 2).
        new Date(placed.alerts.at(-1)!.at).toISOString()
      : item.type === 'meal' && until !== '' && until !== '24:00'
        ? // A Meal fades once its part of the day has gone (TDY-003 2).
          zonedInstant(day, until, timezone)
        : item.ends_at,
  }
}

/**
 * Today's and tomorrow's cards as Today lists them (TDY-006 1): overdue
 * Tasks first, saying so, then the day from Anytime to Evening; every Type
 * Today shows. Tomorrow's too, so the widget turns at midnight with nothing
 * to fetch.
 */
export function widgetDays(
  items: readonly Item[],
  today: string,
  timezone: string,
  alertsOf: (item: Item) => AlertTime[] = () => [],
  now: Date = new Date(),
): WidgetDay[] {
  return [today, addDays(today, 1)].map((day) => {
    const list = todayList(items, day, timezone, alertsOf, now)
    return {
      day,
      cards: [
        ...list.overdue.map((t) => ({
          ...base(t),
          time: 'Overdue',
          done: false,
          ends: null,
        })),
        ...list.parts.flatMap((p) => p.items.map((on) => widgetCard(on, day, timezone))),
      ],
    }
  })
}
