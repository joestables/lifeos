import { addDays, todayIn } from '../../../packages/recurrence/src/days.ts'

/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/** The part of fetch the sync uses, so tests can stand in for Google. */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

/** A calendar to read, as core.calendars_to_sync returns it. */
export interface CalendarToSync {
  connection_id: string
  link_id: string
  calendar_id: string
  level: string
  sync_token: string | null
  synced_until: string | null
  timezone: string
}

/** An event as Google's Calendar API sends it: the fields LifeOS reads. */
export interface GoogleEvent {
  id: string
  status?: string
  etag?: string
  updated?: string
  summary?: string
  description?: string
  location?: string
  recurrence?: string[]
  recurringEventId?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

/** Google refused the refresh token: the connection is broken (GCL-006). */
export class Broken extends Error {}

/** How far back the first read goes, and how far ahead repeats are made (ADR-0047). */
export const WEEKS_BACK = 4
export const WEEKS_AHEAD = 12

const API = 'https://www.googleapis.com/calendar/v3'
export const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

/** An event as core.calendar_save_events takes it (GCL-003). */
export function mapEvent(e: GoogleEvent): Record<string, unknown> {
  if (e.status === 'cancelled') return { external_id: e.id, cancelled: true }
  const allDay = Boolean(e.start?.date)
  const at = (t?: { date?: string; dateTime?: string }) =>
    t?.date ? `${t.date}T00:00:00.000Z` : t?.dateTime ? new Date(t.dateTime).toISOString() : null
  const start = at(e.start)
  const end =
    at(e.end) ?? (allDay && e.start?.date ? `${addDays(e.start.date, 1)}T00:00:00.000Z` : start)
  return {
    external_id: e.id,
    etag: e.etag ?? null,
    updated: e.updated ?? null,
    title: e.summary ?? '',
    body: e.description ?? null,
    place: e.location ?? null,
    all_day: allDay,
    starts_at: start,
    ends_at: end,
    raw: e,
  }
}

/** Google's Calendar API and token endpoint, with one access token. */
export function google(fetch: Fetch, accessToken: string) {
  const get = async (path: string, params: Record<string, string>) => {
    const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 410) return { gone: true as const }
    if (!res.ok)
      throw new Error(`Google ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`)
    return { gone: false as const, body: (await res.json()) as Record<string, unknown> }
  }
  /** Every page of a list. */
  const all = async (path: string, params: Record<string, string>) => {
    const items: GoogleEvent[] = []
    let pageToken: string | undefined
    let syncToken: string | undefined
    do {
      const r = await get(path, { ...params, ...(pageToken ? { pageToken } : {}) })
      if (r.gone) return { gone: true as const, items, syncToken }
      items.push(...((r.body.items as GoogleEvent[]) ?? []))
      pageToken = r.body.nextPageToken as string | undefined
      syncToken = r.body.nextSyncToken as string | undefined
    } while (pageToken)
    return { gone: false as const, items, syncToken }
  }
  return {
    /** My calendars, as calendar_set_calendars takes them. */
    async calendars() {
      const r = await all('/users/me/calendarList', { maxResults: '250' })
      return (r.items as unknown as Record<string, unknown>[]).map((c) => ({
        id: c.id,
        name: (c.summaryOverride as string) ?? (c.summary as string) ?? '',
        can_edit: c.accessRole === 'owner' || c.accessRole === 'writer',
        primary: c.primary === true,
      }))
    },
    events: (calendar: string, from: { syncToken: string } | { timeMin: string }) =>
      all(`/calendars/${encodeURIComponent(calendar)}/events`, {
        singleEvents: 'false',
        showDeleted: 'true',
        maxResults: '250',
        ...from,
      }),
    instances: (calendar: string, event: string, timeMin: string, timeMax: string) =>
      all(
        `/calendars/${encodeURIComponent(calendar)}/events/${encodeURIComponent(event)}/instances`,
        { showDeleted: 'true', maxResults: '250', timeMin, timeMax },
      ),
  }
}

/** A fresh access token from the refresh token; Broken when Google refuses it. */
export async function accessToken(
  fetch: Fetch,
  client: { id: string; secret: string },
  refreshToken: string,
): Promise<string> {
  if (!refreshToken) throw new Broken('no token')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.id,
      client_secret: client.secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, string>
  if (res.status === 400 || res.status === 401) throw new Broken(body.error ?? String(res.status))
  if (!res.ok || !body.access_token) throw new Error(`Google token: ${res.status}`)
  return body.access_token
}

/**
 * Reads one calendar (ADR-0047): from its sync token, or from four weeks back
 * when it has none, when Google has forgotten it (410), or when its repeats
 * need making further ahead. A repeating event comes as its instances up to
 * 12 weeks ahead. Saved in pages; then instances a changed repeat no
 * longer has go, and the next sync token is kept.
 */
export async function syncCalendar(
  rpc: Rpc,
  api: ReturnType<typeof google>,
  cal: CalendarToSync,
  now: Date = new Date(),
): Promise<number> {
  const today = todayIn(cal.timezone, now)
  const until = addDays(today, WEEKS_AHEAD * 7)
  const from = `${addDays(today, -WEEKS_BACK * 7)}T00:00:00Z`
  // Re-read from scratch once a week, so repeats reach 12 weeks ahead again.
  let full =
    !cal.sync_token || !cal.synced_until || cal.synced_until < addDays(today, -7 + WEEKS_AHEAD * 7)
  let read = await api.events(
    cal.calendar_id,
    full ? { timeMin: from } : { syncToken: cal.sync_token! },
  )
  if (read.gone) {
    full = true
    read = await api.events(cal.calendar_id, { timeMin: from })
  }
  const mapped: Record<string, unknown>[] = []
  // Each event read that isn't one instance: the instances it has now, so
  // ones a changed repeat dropped can go (none, if it no longer repeats).
  const masters: { master: string; keep: string[] }[] = []
  for (const e of read.items) {
    if (e.recurrence && e.status !== 'cancelled') {
      const inst = await api.instances(cal.calendar_id, e.id, from, `${until}T00:00:00Z`)
      mapped.push(...inst.items.map(mapEvent))
      masters.push({ master: e.id, keep: inst.items.map((i) => i.id) })
    } else {
      mapped.push(mapEvent(e))
      if (!e.recurringEventId && e.status !== 'cancelled') masters.push({ master: e.id, keep: [] })
    }
  }
  let saved = 0
  for (let i = 0; i < mapped.length; i += 100)
    saved += Number(
      await rpc('calendar_save_events', {
        p_link: cal.link_id,
        p_events: mapped.slice(i, i + 100),
      }),
    )
  if (masters.length > 0)
    await rpc('calendar_prune', {
      p_link: cal.link_id,
      p_masters: masters,
      p_from: from,
      p_until: `${until}T00:00:00Z`,
    })
  await rpc('calendar_synced', {
    p_link: cal.link_id,
    p_sync_token: read.syncToken ?? null,
    p_synced_until: full ? until : null,
  })
  return saved
}

/**
 * The sync run (ADR-0047): each connection that works, or only one, gets a
 * fresh access token (a refusal breaks it, GCL-006), its calendar list
 * refreshed, then each calendar that is on read. One calendar or
 * connection failing doesn't stop the rest; the run reports it.
 */
export async function syncAll(
  rpc: Rpc,
  fetch: Fetch,
  client: { id: string; secret: string },
  { connection = null, now = new Date() }: { connection?: string | null; now?: Date } = {},
) {
  const cals = (await rpc('calendars_to_sync', { p_connection: connection })) as CalendarToSync[]
  const byConnection = new Map<string, CalendarToSync[]>()
  for (const c of cals)
    byConnection.set(c.connection_id, [...(byConnection.get(c.connection_id) ?? []), c])
  let saved = 0
  const failed: { calendar?: string; connection: string; message: string }[] = []
  let broken = 0
  for (const [conn, list] of byConnection) {
    let api: ReturnType<typeof google>
    try {
      const token = (await rpc('calendar_token', { p_connection: conn })) as string
      api = google(fetch, await accessToken(fetch, client, token))
      await rpc('calendar_set_calendars', {
        p_connection: conn,
        p_calendars: await api.calendars(),
      })
    } catch (e) {
      if (e instanceof Broken) {
        await rpc('calendar_broken', { p_connection: conn, p_reason: e.message })
        broken += 1
      } else failed.push({ connection: conn, message: String(e).slice(0, 300) })
      continue
    }
    for (const cal of list) {
      try {
        saved += await syncCalendar(rpc, api, cal, now)
      } catch (e) {
        failed.push({ connection: conn, calendar: cal.link_id, message: String(e).slice(0, 300) })
      }
    }
  }
  return { connections: byConnection.size, saved, broken, failed }
}

/** Where the app may ask to come back to after Google (its own addresses only). */
export function allowedReturn(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      (u.protocol === 'https:' &&
        (u.host === 'lifeos-bice-mu.vercel.app' ||
          /^lifeos-[a-z0-9-]+-joestables1\.vercel\.app$/.test(u.host))) ||
      (u.protocol === 'http:' && u.host === 'localhost:5173')
    )
  } catch {
    return false
  }
}

/** Google's consent page for connecting Calendar (GCL-001). */
export function consentUrl(clientId: string, redirectUri: string, state: string): string {
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    // Asked every time, so Google always sends a refresh token.
    prompt: 'consent',
    state,
  })}`
}

/** The Google account an id token names. */
export function accountOf(idToken: string | undefined): string {
  if (!idToken) return ''
  try {
    const part = idToken.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')
    return String((JSON.parse(atob(part)) as { email?: string }).email ?? '')
  } catch {
    return ''
  }
}
