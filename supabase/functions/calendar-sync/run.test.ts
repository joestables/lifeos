import { describe, expect, it } from 'vitest'
import {
  accountOf,
  allowedReturn,
  consentUrl,
  mapEvent,
  syncAll,
  type CalendarToSync,
  type GoogleEvent,
} from './run.ts'

// 09:00 on Friday 16 October 2026, London.
const NOW = new Date('2026-10-16T08:00:00Z')
const CLIENT = { id: 'client', secret: 'shh' }

const cal = (fields: Partial<CalendarToSync> = {}): CalendarToSync => ({
  connection_id: 'conn',
  link_id: 'main',
  calendar_id: 'ann@gmail.com',
  level: 'incoming',
  sync_token: null,
  synced_until: null,
  timezone: 'Europe/London',
  ...fields,
})

/** A stand-in for Google: answers by path, and records what was asked. */
function fakeGoogle(
  answers: {
    token?: { status: number; body: object }
    calendars?: object[]
    events?: (params: URLSearchParams) => { status?: number; body?: object }
    instances?: Record<string, GoogleEvent[]>
  } = {},
) {
  const asked: string[] = []
  const fetch = async (url: string) => {
    asked.push(url)
    const u = new URL(url)
    const json = (body: object, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    if (u.host === 'oauth2.googleapis.com')
      return json(answers.token?.body ?? { access_token: 'access' }, answers.token?.status ?? 200)
    if (u.pathname.endsWith('/calendarList'))
      return json({
        items: answers.calendars ?? [
          { id: 'ann@gmail.com', summary: 'Ann', accessRole: 'owner', primary: true },
        ],
      })
    const inst = u.pathname.match(/\/events\/([^/]+)\/instances$/)
    if (inst) return json({ items: answers.instances?.[decodeURIComponent(inst[1]!)] ?? [] })
    if (u.pathname.endsWith('/events')) {
      const r = answers.events?.(u.searchParams) ?? {}
      return json(r.body ?? { items: [], nextSyncToken: 'sync-1' }, r.status ?? 200)
    }
    return json({}, 404)
  }
  return { fetch, asked }
}

/** A stand-in for the database: the calendars to read, and every call. */
function database(cals: CalendarToSync[]) {
  const calls: [string, Record<string, unknown>][] = []
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    calls.push([fn, args])
    if (fn === 'calendars_to_sync') return cals
    if (fn === 'calendar_token') return 'refresh'
    if (fn === 'calendar_save_events') return (args.p_events as unknown[]).length
    return null
  }
  return { rpc, calls, of: (fn: string) => calls.filter((c) => c[0] === fn).map((c) => c[1]) }
}

describe('what Google sends, as LifeOS keeps it (GCL-003)', () => {
  it('a timed event, in UTC', () => {
    expect(
      mapEvent({
        id: 'e1',
        summary: 'Dentist',
        location: 'Smile Clinic',
        start: { dateTime: '2026-10-20T09:30:00+01:00' },
        end: { dateTime: '2026-10-20T10:00:00+01:00' },
      }),
    ).toMatchObject({
      external_id: 'e1',
      title: 'Dentist',
      place: 'Smile Clinic',
      all_day: false,
      starts_at: '2026-10-20T08:30:00.000Z',
      ends_at: '2026-10-20T09:00:00.000Z',
    })
  })
  it('EVT-001 3: an all-day event as its dates, the end the day after the last', () => {
    expect(
      mapEvent({ id: 'e2', start: { date: '2026-10-24' }, end: { date: '2026-10-27' } }),
    ).toMatchObject({
      all_day: true,
      starts_at: '2026-10-24T00:00:00.000Z',
      ends_at: '2026-10-27T00:00:00.000Z',
      title: '',
    })
  })
  it('GCL-003 2: a cancelled one is only its id', () => {
    expect(mapEvent({ id: 'e3', status: 'cancelled' })).toEqual({
      external_id: 'e3',
      cancelled: true,
    })
  })
})

describe('the sync run (ADR-0047)', () => {
  it('GCL-003 1, 3: the first read goes four weeks back; a repeating event comes as its instances', async () => {
    const g = fakeGoogle({
      events: () => ({
        body: {
          items: [
            {
              id: 'one',
              summary: 'Dentist',
              start: { dateTime: '2026-10-20T08:30:00Z' },
              end: { dateTime: '2026-10-20T09:00:00Z' },
            },
            {
              id: 'w',
              summary: '5-a-side',
              recurrence: ['RRULE:FREQ=WEEKLY'],
              start: { dateTime: '2026-10-21T19:00:00+01:00' },
            },
          ],
          nextSyncToken: 'sync-1',
        },
      }),
      instances: {
        w: [
          {
            id: 'w_1',
            recurringEventId: 'w',
            summary: '5-a-side',
            start: { dateTime: '2026-10-21T19:00:00+01:00' },
            end: { dateTime: '2026-10-21T20:00:00+01:00' },
          },
          {
            id: 'w_2',
            recurringEventId: 'w',
            summary: '5-a-side',
            start: { dateTime: '2026-10-28T19:00:00Z' },
            end: { dateTime: '2026-10-28T20:00:00Z' },
          },
        ],
      },
    })
    const db = database([cal()])
    const run = await syncAll(db.rpc, g.fetch, CLIENT, { now: NOW })
    expect(run).toEqual({ connections: 1, saved: 3, broken: 0, failed: [] })
    const list = new URL(g.asked.find((u) => u.includes('/events?'))!)
    expect(list.searchParams.get('timeMin')).toBe('2026-09-18T00:00:00Z')
    expect(list.searchParams.get('singleEvents')).toBe('false')
    const inst = new URL(g.asked.find((u) => u.includes('/instances'))!)
    expect(inst.searchParams.get('timeMax')).toBe('2027-01-08T00:00:00Z')
    expect(
      (db.of('calendar_save_events')[0]!.p_events as { external_id: string }[]).map(
        (e) => e.external_id,
      ),
    ).toEqual(['one', 'w_1', 'w_2'])
    expect(db.of('calendar_synced')).toEqual([
      { p_link: 'main', p_sync_token: 'sync-1', p_synced_until: '2027-01-08' },
    ])
    // GCL-003 3: instances a changed repeat no longer has go; a single event has none.
    expect(db.of('calendar_prune')).toEqual([
      {
        p_link: 'main',
        p_masters: [
          { master: 'one', keep: [] },
          { master: 'w', keep: ['w_1', 'w_2'] },
        ],
        p_from: '2026-09-18T00:00:00Z',
        p_until: '2027-01-08T00:00:00Z',
      },
    ])
    expect(db.of('calendar_set_calendars')[0]!.p_calendars).toEqual([
      { id: 'ann@gmail.com', name: 'Ann', can_edit: true, primary: true },
    ])
  })

  it('carries on from its sync token; when Google has forgotten it (410), reads again from scratch', async () => {
    const g = fakeGoogle({
      events: (p) =>
        p.get('syncToken')
          ? { status: 410, body: {} }
          : { body: { items: [], nextSyncToken: 'sync-2' } },
    })
    const db = database([cal({ sync_token: 'old', synced_until: '2027-01-08' })])
    await syncAll(db.rpc, g.fetch, CLIENT, { now: NOW })
    const lists = g.asked.filter((u) => u.includes('/events?')).map((u) => new URL(u).searchParams)
    expect(lists.map((p) => p.get('syncToken') ?? p.get('timeMin'))).toEqual([
      'old',
      '2026-09-18T00:00:00Z',
    ])
    expect(db.of('calendar_synced')[0]).toMatchObject({
      p_sync_token: 'sync-2',
      p_synced_until: '2027-01-08',
    })
  })

  it('with a fresh sync token and repeats made far enough ahead, reads only what changed', async () => {
    const g = fakeGoogle()
    const db = database([cal({ sync_token: 'old', synced_until: '2027-01-08' })])
    await syncAll(db.rpc, g.fetch, CLIENT, { now: NOW })
    const list = new URL(g.asked.find((u) => u.includes('/events?'))!)
    expect(list.searchParams.get('syncToken')).toBe('old')
    expect(db.of('calendar_synced')[0]).toMatchObject({ p_synced_until: null })
  })

  it('GCL-006 1: Google refusing the token breaks the connection, and nothing is read', async () => {
    const g = fakeGoogle({ token: { status: 400, body: { error: 'invalid_grant' } } })
    const db = database([cal()])
    const run = await syncAll(db.rpc, g.fetch, CLIENT, { now: NOW })
    expect(run.broken).toBe(1)
    expect(db.of('calendar_broken')).toEqual([{ p_connection: 'conn', p_reason: 'invalid_grant' }])
    expect(g.asked.some((u) => u.includes('/events'))).toBe(false)
  })

  it('one calendar failing doesn’t stop the rest', async () => {
    const g = fakeGoogle({
      events: () => ({ status: 500, body: {} }),
    })
    const db = database([cal(), cal({ link_id: 'family', calendar_id: 'family' })])
    const run = await syncAll(db.rpc, g.fetch, CLIENT, { now: NOW })
    expect(run.failed.map((f) => f.calendar)).toEqual(['main', 'family'])
  })
})

describe('connecting (GCL-001)', () => {
  it('asks Google for Calendar, offline, every time', () => {
    const u = new URL(
      consentUrl('client', 'https://x.supabase.co/functions/v1/calendar-callback', 'st'),
    )
    expect(u.searchParams.get('scope')).toBe(
      'openid email https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events',
    )
    expect(u.searchParams.get('access_type')).toBe('offline')
    expect(u.searchParams.get('prompt')).toBe('consent')
    expect(u.searchParams.get('state')).toBe('st')
  })
  it('comes back only to the app’s own addresses', () => {
    expect(allowedReturn('https://lifeos-bice-mu.vercel.app/settings')).toBe(true)
    expect(allowedReturn('https://lifeos-git-x-joestables1.vercel.app/settings')).toBe(true)
    expect(allowedReturn('http://localhost:5173/settings')).toBe(true)
    expect(allowedReturn('https://evil.example/settings')).toBe(false)
    expect(allowedReturn('https://lifeos-bice-mu.vercel.app.evil.example/')).toBe(false)
  })
  it('reads the Google account from the id token', () => {
    const payload = btoa(JSON.stringify({ email: 'ann@gmail.com' })).replace(/=+$/, '')
    expect(accountOf(`h.${payload}.s`)).toBe('ann@gmail.com')
    expect(accountOf(undefined)).toBe('')
  })
})
