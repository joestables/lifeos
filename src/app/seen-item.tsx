import {
  CalendarClockIcon,
  CalendarDaysIcon,
  LockIcon,
  MapPinIcon,
  StickyNoteIcon,
  UsersIcon,
} from 'lucide-react'
import { EventFact, ItemNote } from '@/components/lifeos'
import { queue, useFoodSpaces, useItems, useLinks, useSettings, type Item } from '@/data'
import { dateName } from '@/lib/dates'
import { eventTimes, eventWhen } from '@/lib/events'

/**
 * Someone else's Personal Item I see only through a link to a shared one
 * (HSH-005 7, ADR-0016): whose it is, and what it says as lines, not
 * fields. Nothing here changes it.
 */
export function SeenDetails({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const { firstName } = useFoodSpaces(queue)
  const t = item.type === 'event' ? eventTimes(item, settings.timezone) : null
  return (
    <div className="flex flex-col gap-4">
      <ItemNote icon={<LockIcon aria-hidden />}>{firstName(item.owner_id)}’s</ItemNote>
      <div className="flex flex-col">
        {t && <EventFact icon={<CalendarDaysIcon />}>{eventWhen(t)}</EventFact>}
        {item.do_on && (
          <EventFact icon={<CalendarDaysIcon />}>
            {dateName(item.do_on)}
            {item.do_at ? ` ${item.do_at.slice(0, 5)}` : ''}
          </EventFact>
        )}
        {item.due_on && (
          <EventFact icon={<CalendarClockIcon />}>Due {dateName(item.due_on)}</EventFact>
        )}
        {item.place && <EventFact icon={<MapPinIcon />}>{item.place}</EventFact>}
        {item.body && (
          <EventFact icon={<StickyNoteIcon />}>
            <span className="text-muted-foreground">{item.body}</span>
          </EventFact>
        )}
      </div>
    </div>
  )
}

/**
 * "Visible to Home": my Personal Item linked to a shared one, which the
 * Household's members can see (ADR-0016 3).
 */
export function VisibleTo({ item }: { item: Item }) {
  const links = useLinks(queue)
  const { items } = useItems(queue)
  const { personal, householdName } = useFoodSpaces(queue)
  if (!personal || item.space_id !== personal) return null
  const byId = new Map(items.map((i) => [i.id, i]))
  const names = new Set<string>()
  for (const l of links) {
    const other = l.from_item === item.id ? l.to_item : l.to_item === item.id ? l.from_item : null
    const o = other ? byId.get(other) : undefined
    const name = o && !o.archived_at ? householdName(o.space_id) : undefined
    if (name) names.add(name)
  }
  if (names.size === 0) return null
  return <ItemNote icon={<UsersIcon aria-hidden />}>Visible to {[...names].join(', ')}</ItemNote>
}
