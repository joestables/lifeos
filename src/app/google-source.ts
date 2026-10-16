import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui/sonner'
import { calendarAction, queue, useCalendar, type Item } from '@/data'

/** Whether my connection is there and reading (not disconnected). */
export const isOn = (c: ReturnType<typeof useCalendar>['connection']) =>
  c !== null && !c.disconnected_at

/** Sends me to Google to connect, or reconnect, my calendars (GCL-001, GCL-006 2). */
export async function connectGoogleCalendar() {
  try {
    const { url } = await calendarAction('start', `${window.location.origin}/settings`)
    if (url) window.location.assign(url)
  } catch {
    toast('Couldn’t reach Google Calendar. Try again in a moment')
  }
}

/**
 * Where an Event came from, if Google (GCL-003, GCL-004): its calendar, its
 * level, and whether Google's fields are Google's (an incoming calendar).
 */
export function useGoogleSource(item: Pick<Item, 'id' | 'type'>) {
  const { refs, links, isLoading } = useCalendar(queue)
  const ref = refs.find((r) => r.item_id === item.id)
  // Until it's known, an Event isn't taken to be mine to change.
  if (isLoading && item.type === 'event') return { ref: undefined, link: undefined, readOnly: true }
  if (!ref) return null
  const link = links.find((l) => l.id === ref.calendar_link_id)
  return {
    ref,
    link,
    /** Not two-way: it can't be changed, moved or deleted here (GCL-004). */
    readOnly: link?.level !== 'two_way',
  }
}

/** The ids of Events from calendars that aren't two-way, for Plan's dragging (PLN-007 4). */
export function useGoogleReadOnly(): ReadonlySet<string> {
  const { refs, links } = useCalendar(queue)
  const twoWay = new Set(links.filter((l) => l.level === 'two_way').map((l) => l.id))
  return new Set(
    refs
      .filter((r) => !r.calendar_link_id || !twoWay.has(r.calendar_link_id))
      .map((r) => r.item_id),
  )
}

/** When Plan opens, Google is asked for changes, at most once a minute (ADR-0047). */
export function useSyncOnOpen() {
  const { connection } = useCalendar(queue)
  const asked = useRef(false)
  const on = isOn(connection) && connection?.state === 'connected'
  useEffect(() => {
    if (!on || asked.current) return
    asked.current = true
    void calendarAction('sync').catch(() => {})
  }, [on])
}
