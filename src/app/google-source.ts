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
 * An Event made in LifeOS is mine whatever its calendar is now, shown as in
 * Google only while that calendar is two-way; anything but an Event isn't
 * Google's at all.
 */
export function useGoogleSource(item: Pick<Item, 'id' | 'type'>) {
  const { refs, links, isLoading } = useCalendar(queue)
  if (item.type !== 'event') return null
  // Until it's known, an Event isn't taken to be mine to change.
  if (isLoading) return { ref: undefined, link: undefined, readOnly: true }
  const ref = refs.find((r) => r.item_id === item.id)
  if (!ref) return null
  const link = links.find((l) => l.id === ref.calendar_link_id)
  if (ref.made_in_lifeos && link?.level !== 'two_way') return null
  return {
    ref,
    link,
    /** Google's, from a calendar that isn't two-way: it can't be changed, moved or deleted here (GCL-004). */
    readOnly: !ref.made_in_lifeos && link?.level !== 'two_way',
  }
}

/**
 * Whether an Item on Plan is Google's and so can't be dragged (PLN-007 4):
 * an Event from a calendar that isn't two-way, or any Event while that
 * isn't known yet.
 */
export function useGoogleLocked(): (item: Pick<Item, 'id' | 'type'>) => boolean {
  const { refs, links, isLoading } = useCalendar(queue)
  const twoWay = new Set(links.filter((l) => l.level === 'two_way').map((l) => l.id))
  const locked = new Set(
    refs
      .filter((r) => !r.made_in_lifeos && (!r.calendar_link_id || !twoWay.has(r.calendar_link_id)))
      .map((r) => r.item_id),
  )
  return (item) => item.type === 'event' && (isLoading || locked.has(item.id))
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
