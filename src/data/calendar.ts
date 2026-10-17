import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

/** My Google Calendar connection, as the app may read it (ADR-0047). */
export interface Connection {
  id: string
  account: string
  state: 'connected' | 'broken'
  broken_since: string | null
  last_synced_at: string | null
  disconnected_at: string | null
}

/** One of my Google calendars, and its sync level (GCL-002). */
export interface CalendarLink {
  id: string
  calendar_id: string
  name: string
  can_edit: boolean
  is_primary: boolean
  level: 'off' | 'incoming' | 'two_way'
  new_events: boolean
}

/** Which Event came from which calendar (GCL-003). */
export interface ExternalRef {
  item_id: string
  calendar_link_id: string | null
  external_id: string
  /** Sent from LifeOS, not brought in: it stays mine (GCL-001 3). */
  made_in_lifeos: boolean
}

export interface Calendar {
  /** None until I first connect; one disconnected stays, emptied. */
  connection: Connection | null
  links: CalendarLink[]
  refs: ExternalRef[]
}

export const calendarKey = ['calendar'] as const

export async function fetchCalendar(): Promise<Calendar> {
  const db = supabase()
  const [c, l, r] = await Promise.all([
    db
      .from('connections')
      .select('id, account, state, broken_since, last_synced_at, disconnected_at')
      .eq('provider', 'google_calendar'),
    db
      .from('calendar_links')
      .select('id, calendar_id, name, can_edit, is_primary, level, new_events')
      .order('is_primary', { ascending: false })
      .order('name'),
    db.from('external_refs').select('item_id, calendar_link_id, external_id, made_in_lifeos'),
  ])
  if (c.error) throw c.error
  if (l.error) throw l.error
  if (r.error) throw r.error
  return {
    connection: (c.data[0] as Connection | undefined) ?? null,
    links: l.data as CalendarLink[],
    refs: r.data,
  }
}

/** Lays unsent level changes, and my default calendar, over what the server last sent. */
export function applyPendingCalendar(cal: Calendar, entries: readonly QueueEntry[]): Calendar {
  let links = cal.links
  for (const entry of entries) {
    if (entry.fn === 'set_calendar_level') {
      const a = entry.args as { p_link: string; p_level: CalendarLink['level'] }
      links = links.map((l) =>
        l.id === a.p_link
          ? { ...l, level: a.p_level, new_events: l.new_events && a.p_level === 'two_way' }
          : l,
      )
    } else if (entry.fn === 'set_new_events_calendar') {
      const a = entry.args as { p_link: string | null }
      links = links.map((l) => ({ ...l, new_events: l.id === a.p_link }))
    }
  }
  return { ...cal, links }
}

/**
 * Asks the calendar-connect Edge Function, as me (GCL-001): start connecting
 * (it answers with Google's consent page), disconnect, or sync now.
 */
export async function calendarAction(
  action: 'start' | 'disconnect' | 'sync',
  returnTo?: string,
): Promise<{ url?: string; connected?: boolean; skipped?: boolean }> {
  const { data, error } = await supabase().functions.invoke('calendar-connect', {
    body: { action, returnTo },
  })
  if (error) throw error
  return data as { url?: string; connected?: boolean; skipped?: boolean }
}

/**
 * Google's own page for an event: its id and calendar, as Google writes
 * them into the event's link.
 */
export function googleEventUrl(externalId: string, calendarId: string): string {
  const eid = btoa(`${externalId} ${calendarId}`).replace(/=+$/, '')
  return `https://calendar.google.com/calendar/event?eid=${eid}`
}
