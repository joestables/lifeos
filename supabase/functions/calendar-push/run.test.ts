import { describe, expect, it } from 'vitest'
import { googleRule, pushAll, type PushJob } from './run.ts'

const CLIENT = { id: 'client', secret: 'shh' }

const itemJob = (
  fields: Partial<NonNullable<PushJob['item']>> = {},
  job: Partial<PushJob> = {},
): PushJob => ({
  outbox: 1,
  queued_at: '2026-10-16T10:00:00Z',
  connection: 'conn',
  link: 'main',
  calendar_id: 'ann@gmail.com',
  timezone: 'Europe/London',
  item: {
    id: 'dinner',
    type: 'event',
    title: 'Dinner with Sam',
    body: null,
    place: 'Dishoom',
    starts_at: '2026-10-21T18:30:00.000Z',
    ends_at: '2026-10-21T20:30:00.000Z',
    all_day: false,
    archived: false,
    external_id: null,
    etag: null,
    ...fields,
  },
  series: null,
  ...job,
})

/** A stand-in for Google's Calendar API: records each call, answers from a script. */
function fakeGoogle(
  answer: (method: string, path: string, init?: RequestInit) => { status: number; body?: object },
) {
  const calls: {
    method: string
    path: string
    body?: Record<string, unknown>
    ifMatch?: string
  }[] = []
  const fetch = async (url: string, init?: RequestInit) => {
    const u = new URL(url)
    if (u.host === 'oauth2.googleapis.com') return Response.json({ access_token: 'access' })
    const method = init?.method ?? 'GET'
    const headers = (init?.headers ?? {}) as Record<string, string>
    calls.push({
      method,
      path: u.pathname.replace('/calendar/v3', '') + (u.search && method === 'GET' ? '' : ''),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      ifMatch: headers['If-Match'],
    })
    const r = answer(method, u.pathname, init)
    return new Response(r.body ? JSON.stringify(r.body) : null, { status: r.status })
  }
  return { fetch, calls }
}

function database(jobs: PushJob[]) {
  const calls: [string, Record<string, unknown>][] = []
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    calls.push([fn, args])
    if (fn === 'calendar_outbox_claim') return jobs
    if (fn === 'calendar_token') return 'refresh'
    return null
  }
  return { rpc, of: (fn: string) => calls.filter((c) => c[0] === fn).map((c) => c[1]) }
}

describe('what goes to Google (GCL-005)', () => {
  it('1, 4: a new Event is made in the calendar where new Events go, with my id and nothing else of mine', async () => {
    const g = fakeGoogle(() => ({
      status: 200,
      body: { id: 'g-dinner', etag: '"1"', updated: '2026-10-16T10:00:05Z' },
    }))
    const db = database([itemJob()])
    expect(await pushAll(db.rpc, g.fetch, CLIENT)).toEqual({
      jobs: 1,
      sent: 1,
      failed: 0,
      broken: 0,
    })
    expect(g.calls[0]).toMatchObject({ method: 'POST', path: '/calendars/ann%40gmail.com/events' })
    expect(g.calls[0]!.body).toEqual({
      summary: 'Dinner with Sam',
      description: '',
      location: 'Dishoom',
      start: { dateTime: '2026-10-21T18:30:00.000Z', timeZone: 'Europe/London' },
      end: { dateTime: '2026-10-21T20:30:00.000Z', timeZone: 'Europe/London' },
      status: 'confirmed',
      extendedProperties: { private: { lifeosId: 'dinner' } },
    })
    expect(db.of('calendar_pushed')).toEqual([
      {
        p_outbox: 1,
        p_refs: [
          {
            item_id: 'dinner',
            link: 'main',
            external_id: 'g-dinner',
            etag: '"1"',
            updated: '2026-10-16T10:00:05Z',
          },
        ],
      },
    ])
  })

  it('EVT-001 3: an all-day Event goes as its dates', async () => {
    const g = fakeGoogle(() => ({ status: 200, body: { id: 'g' } }))
    await pushAll(
      database([
        itemJob({
          all_day: true,
          starts_at: '2026-10-24T00:00:00.000Z',
          ends_at: '2026-10-27T00:00:00.000Z',
        }),
      ]).rpc,
      g.fetch,
      CLIENT,
    )
    expect(g.calls[0]!.body).toMatchObject({
      start: { date: '2026-10-24' },
      end: { date: '2026-10-27' },
    })
  })

  it('2: a change goes with Google’s etag; deleted in LifeOS, it is deleted in Google', async () => {
    const g = fakeGoogle((m) => ({
      status: m === 'DELETE' ? 204 : 200,
      body: m === 'DELETE' ? undefined : { id: 'g-dinner', etag: '"2"' },
    }))
    await pushAll(
      database([
        itemJob({ external_id: 'g-dinner', etag: '"1"' }),
        itemJob({ external_id: 'g-dinner', archived: true }, { outbox: 2 }),
      ]).rpc,
      g.fetch,
      CLIENT,
    )
    expect(g.calls.map((c) => [c.method, c.ifMatch])).toEqual([
      ['PATCH', '"1"'],
      ['DELETE', undefined],
    ])
  })

  it('ADR-0048: when Google changed it since, the later change wins', async () => {
    // Google's change came after mine: Google's is kept, mine isn't sent.
    const later = fakeGoogle((m) =>
      m === 'PATCH'
        ? { status: 412 }
        : {
            status: 200,
            body: {
              id: 'g-dinner',
              etag: '"9"',
              updated: '2026-10-16T11:00:00Z',
              summary: 'Dinner (moved)',
            },
          },
    )
    const db = database([itemJob({ external_id: 'g-dinner', etag: '"1"' })])
    await pushAll(db.rpc, later.fetch, CLIENT)
    expect(later.calls.map((c) => c.method)).toEqual(['PATCH', 'GET'])
    expect((db.of('calendar_save_events')[0]!.p_events as { title: string }[])[0]!.title).toBe(
      'Dinner (moved)',
    )

    // Mine came after Google's: mine is sent anyway.
    let patches = 0
    const earlier = fakeGoogle((m) =>
      m === 'PATCH'
        ? patches++ === 0
          ? { status: 412 }
          : { status: 200, body: { id: 'g-dinner', etag: '"10"' } }
        : { status: 200, body: { id: 'g-dinner', etag: '"9"', updated: '2026-10-16T09:00:00Z' } },
    )
    await pushAll(
      database([itemJob({ external_id: 'g-dinner', etag: '"1"' })]).rpc,
      earlier.fetch,
      CLIENT,
    )
    expect(earlier.calls.map((c) => [c.method, c.ifMatch])).toEqual([
      ['PATCH', '"1"'],
      ['GET', undefined],
      ['PATCH', undefined],
    ])
  })

  it('3: a repeating Event goes as one repeating event, each occurrence matched to its instance', async () => {
    const g = fakeGoogle((m, path) =>
      path.endsWith('/instances')
        ? {
            status: 200,
            body: {
              items: [
                { id: 'w_1', originalStartTime: { dateTime: '2026-10-21T19:00:00+01:00' } },
                { id: 'w_2', originalStartTime: { dateTime: '2026-10-28T19:00:00Z' } },
                { id: 'w_3', originalStartTime: { dateTime: '2026-11-04T19:00:00Z' } },
              ],
            },
          }
        : m === 'DELETE'
          ? { status: 204 }
          : { status: 200, body: { id: 'w', etag: '"1"' } },
    )
    const occ = (id: string, on: string, utc: string, f = {}) => ({
      id,
      on,
      starts_at: `${on}T${utc}:00.000Z`,
      ends_at: null,
      all_day: false,
      archived: false,
      touched: false,
      ...f,
    })
    const db = database([
      itemJob(
        {},
        {
          item: null,
          series: {
            id: 's1',
            rule: 'FREQ=WEEKLY;BYDAY=WE',
            ended_on: null,
            template: { title: '5-a-side', start_time: '19:00', duration_minutes: 60 },
            external_id: null,
            etag: null,
            occurrences: [
              occ('o1', '2026-10-21', '18:00'),
              occ('o2', '2026-10-28', '19:00'),
              occ('o3', '2026-11-04', '19:00', { archived: true }),
            ],
          },
        },
      ),
    ])
    await pushAll(db.rpc, g.fetch, CLIENT)
    expect(g.calls[0]!.body).toMatchObject({
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'],
      summary: '5-a-side',
    })
    expect(g.calls.at(-1)).toMatchObject({
      method: 'DELETE',
      path: '/calendars/ann%40gmail.com/events/w_3',
    })
    expect(db.of('calendar_pushed')[0]).toMatchObject({
      p_refs: [
        { item_id: 'o1', external_id: 'w_1' },
        { item_id: 'o2', external_id: 'w_2' },
      ],
      p_series_ref: { series_id: 's1', external_id: 'w' },
    })
  })

  it('ADR-0048: a stopped repeat ends Google’s rule, in UTC for a timed event', () => {
    expect(googleRule('FREQ=WEEKLY;BYDAY=WE', '2026-12-01', false)).toBe(
      'RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20261201T235959Z',
    )
    expect(googleRule('FREQ=DAILY;COUNT=5', '2026-12-01', true)).toBe(
      'RRULE:FREQ=DAILY;UNTIL=20261201',
    )
    expect(googleRule('FREQ=MONTHLY;UNTIL=20270101', null, false)).toBe(
      'RRULE:FREQ=MONTHLY;UNTIL=20270101T235959Z',
    )
  })

  it('GCL-006: a refused token breaks the connection and holds its jobs', async () => {
    const fetch = async () =>
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    const db = database([itemJob()])
    expect(await pushAll(db.rpc, fetch, CLIENT)).toMatchObject({ sent: 0, failed: 1, broken: 1 })
    expect(db.of('calendar_broken')).toHaveLength(1)
    expect(db.of('calendar_unpushed')).toHaveLength(1)
  })
})
