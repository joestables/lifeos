import {
  accessToken,
  Broken,
  mapEvent,
  type Fetch,
  type GoogleEvent,
  type Rpc,
} from '../calendar-sync/run.ts'

/** An Event as calendar-push sends it. */
export interface PushItem {
  id: string
  type: string
  title: string
  body: string | null
  place: string | null
  starts_at: string | null
  ends_at: string | null
  all_day: boolean | null
  archived: boolean
  external_id: string | null
  etag: string | null
}

/** One of a series' occurrences. */
export interface PushOccurrence {
  id: string
  on: string
  starts_at: string | null
  ends_at: string | null
  all_day: boolean | null
  archived: boolean
  touched: boolean
}

/** A repeating Event, as calendar-push sends it: one repeating event in Google. */
export interface PushSeries {
  id: string
  rule: string
  ended_on: string | null
  template: {
    title?: string
    body?: string | null
    place?: string | null
    start_time?: string | null
    duration_minutes?: number | null
    all_day?: boolean
    days?: number | null
  }
  external_id: string | null
  etag: string | null
  occurrences: PushOccurrence[]
}

/** A job, as core.calendar_outbox_claim returns it. */
export interface PushJob {
  outbox: number
  queued_at: string
  connection: string
  link: string
  calendar_id: string
  timezone: string
  item: PushItem | null
  series: PushSeries | null
}

const API = 'https://www.googleapis.com/calendar/v3'
const day = (iso: string) => iso.slice(0, 10)
const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Google's start and end for times kept as LifeOS keeps them (EVT-001 3). */
export function googleTimes(
  t: { starts_at: string | null; ends_at: string | null; all_day: boolean | null },
  timezone: string,
) {
  if (t.all_day)
    return {
      start: { date: day(t.starts_at!) },
      end: { date: day(t.ends_at ?? addDays(day(t.starts_at!), 1)) },
    }
  return {
    start: { dateTime: t.starts_at!, timeZone: timezone },
    end: { dateTime: t.ends_at ?? t.starts_at!, timeZone: timezone },
  }
}

/** What Google is sent for an Event (ADR-0048): never its Labels, Reminders or Tasks (GCL-005 4). */
export function eventBody(item: PushItem, timezone: string): Record<string, unknown> {
  return {
    summary: item.title,
    description: item.body ?? '',
    location: item.place ?? '',
    ...googleTimes(item, timezone),
    status: 'confirmed',
    extendedProperties: { private: { lifeosId: item.id } },
  }
}

/**
 * A series' rule as Google takes it: ended where LifeOS ended it, its end in
 * UTC for a timed event, as the iCalendar standard asks.
 */
export function googleRule(rule: string, endedOn: string | null, allDay: boolean): string {
  const parts = rule.split(';').filter((p) => p !== '')
  const ownUntil = parts.find((p) => p.startsWith('UNTIL='))?.slice(6)
  const until = endedOn ? endedOn.replaceAll('-', '') : ownUntil
  const kept = parts.filter((p) => !p.startsWith('UNTIL=') && !(endedOn && p.startsWith('COUNT=')))
  if (until) kept.push(`UNTIL=${allDay ? until.slice(0, 8) : `${until.slice(0, 8)}T235959Z`}`)
  return `RRULE:${kept.join(';')}`
}

/** A LifeOS series as one repeating Google event, from its first live occurrence. */
export function seriesBody(series: PushSeries, timezone: string, first: PushOccurrence) {
  const t = series.template
  const allDay = Boolean(t.all_day)
  const times = allDay
    ? {
        start: { date: first.on },
        end: { date: addDays(first.on, t.days ?? 1) },
      }
    : googleTimes(first, timezone)
  return {
    summary: t.title ?? '',
    description: t.body ?? '',
    location: t.place ?? '',
    ...times,
    recurrence: [googleRule(series.rule, series.ended_on, allDay)],
    status: 'confirmed',
    extendedProperties: { private: { lifeosSeries: series.id } },
  }
}

/** Google's Calendar API, writing, with one access token. */
export function calendarWriter(fetch: Fetch, token: string) {
  const call = async (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    return { status: res.status, body: (text ? JSON.parse(text) : null) as GoogleEvent | null }
  }
  const events = (cal: string) => `/calendars/${encodeURIComponent(cal)}/events`
  return {
    insert: (cal: string, body: unknown) => call('POST', events(cal), body),
    patch: (cal: string, id: string, body: unknown, etag?: string | null) =>
      call(
        'PATCH',
        `${events(cal)}/${encodeURIComponent(id)}`,
        body,
        etag ? { 'If-Match': etag } : {},
      ),
    get: (cal: string, id: string) => call('GET', `${events(cal)}/${encodeURIComponent(id)}`),
    remove: (cal: string, id: string) => call('DELETE', `${events(cal)}/${encodeURIComponent(id)}`),
    async instances(cal: string, id: string, timeMin: string, timeMax: string) {
      const out: (GoogleEvent & { originalStartTime?: { date?: string; dateTime?: string } })[] = []
      let pageToken: string | undefined
      do {
        const params = new URLSearchParams({
          timeMin,
          timeMax,
          showDeleted: 'true',
          maxResults: '250',
          ...(pageToken ? { pageToken } : {}),
        })
        const r = await call('GET', `${events(cal)}/${encodeURIComponent(id)}/instances?${params}`)
        if (r.status >= 400) throw new Error(`Google instances: ${r.status}`)
        const body = r.body as unknown as { items?: typeof out; nextPageToken?: string }
        out.push(...(body.items ?? []))
        pageToken = body.nextPageToken
      } while (pageToken)
      return out
    },
  }
}

type Writer = ReturnType<typeof calendarWriter>
type Ref = { item_id: string; link: string; external_id: string; etag?: string; updated?: string }
const ok = (status: number) => status >= 200 && status < 300
const gone = (status: number) => status === 404 || status === 410
const refOf = (job: PushJob, itemId: string, e: GoogleEvent): Ref => ({
  item_id: itemId,
  link: job.link,
  external_id: e.id,
  etag: e.etag,
  updated: e.updated,
})

/**
 * One Event to Google (GCL-005 1, 2, 5): made, changed, or (deleted, or
 * switched into a Task) taken out. A change goes with Google's last-known
 * etag; if Google has changed it since, the later change wins (ADR-0048):
 * Google's, if after mine was made, is kept in LifeOS instead.
 */
export async function pushItem(rpc: Rpc, g: Writer, job: PushJob): Promise<{ refs: Ref[] }> {
  const item = job.item!
  if (item.archived || item.type !== 'event') {
    if (item.external_id) {
      const r = await g.remove(job.calendar_id, item.external_id)
      if (!ok(r.status) && !gone(r.status)) throw new Error(`Google delete: ${r.status}`)
    }
    return { refs: [] }
  }
  const body = eventBody(item, job.timezone)
  if (item.external_id) {
    let r = await g.patch(job.calendar_id, item.external_id, body, item.etag)
    if (r.status === 412) {
      const theirs = await g.get(job.calendar_id, item.external_id)
      if (theirs.body?.updated && Date.parse(theirs.body.updated) > Date.parse(job.queued_at)) {
        await rpc('calendar_save_events', { p_link: job.link, p_events: [mapEvent(theirs.body)] })
        return { refs: [refOf(job, item.id, theirs.body)] }
      }
      r = await g.patch(job.calendar_id, item.external_id, body)
    }
    if (ok(r.status)) return { refs: [refOf(job, item.id, r.body!)] }
    if (!gone(r.status)) throw new Error(`Google update: ${r.status}`)
  }
  const made = await g.insert(job.calendar_id, body)
  if (!ok(made.status)) throw new Error(`Google insert: ${made.status}`)
  return { refs: [refOf(job, item.id, made.body!)] }
}

/**
 * A repeating Event to Google as one repeating event (GCL-005 3, ADR-0048):
 * its rule ended where LifeOS ended it; then each occurrence matched to its
 * instance by day, an occurrence I changed sent as itself, and one I
 * deleted cancelled.
 */
export async function pushSeries(
  g: Writer,
  job: PushJob,
): Promise<{ refs: Ref[]; seriesRef: Record<string, string | undefined> | null }> {
  const s = job.series!
  const live = s.occurrences.filter((o) => !o.archived)
  const first = live[0]
  if (!first) {
    if (s.external_id) await g.remove(job.calendar_id, s.external_id)
    return { refs: [], seriesRef: null }
  }
  // Its start is that of the first occurrence still as the series made it.
  const body = seriesBody(s, job.timezone, live.find((o) => !o.touched) ?? first)
  let master = s.external_id ? await g.patch(job.calendar_id, s.external_id, body) : null
  if (!master || gone(master.status)) master = await g.insert(job.calendar_id, body)
  if (!ok(master.status) || !master.body) throw new Error(`Google series: ${master.status}`)

  const last = s.occurrences[s.occurrences.length - 1]!
  const instances = await g.instances(
    job.calendar_id,
    master.body.id,
    `${addDays(first.on, -1)}T00:00:00Z`,
    `${addDays(last.on, 2)}T00:00:00Z`,
  )
  const onOf = (e: (typeof instances)[number]) => {
    const t = e.originalStartTime ?? e.start
    if (t?.date) return t.date
    return new Intl.DateTimeFormat('en-CA', { timeZone: job.timezone }).format(
      new Date(t!.dateTime!),
    )
  }
  const byDay = new Map(instances.map((e) => [onOf(e), e]))
  const refs: Ref[] = []
  for (const o of s.occurrences) {
    const inst = byDay.get(o.on)
    if (!inst) continue
    if (o.archived) {
      if (inst.status !== 'cancelled') await g.remove(job.calendar_id, inst.id)
      continue
    }
    if (o.touched) {
      const r = await g.patch(job.calendar_id, inst.id, googleTimes(o, job.timezone))
      refs.push(refOf(job, o.id, ok(r.status) && r.body ? r.body : inst))
    } else refs.push(refOf(job, o.id, inst))
  }
  return {
    refs,
    seriesRef: {
      series_id: s.id,
      link: job.link,
      external_id: master.body.id,
      etag: master.body.etag,
    },
  }
}

/**
 * The push run (ADR-0048): what is due, connection by connection, each job
 * sent and recorded; a refused token breaks its connection (GCL-006) and
 * holds its jobs; any other failure is noted and tried again later.
 */
export async function pushAll(rpc: Rpc, fetch: Fetch, client: { id: string; secret: string }) {
  const jobs = (await rpc('calendar_outbox_claim', { p_limit: 50 })) as PushJob[]
  const byConnection = new Map<string, PushJob[]>()
  for (const j of jobs)
    byConnection.set(j.connection, [...(byConnection.get(j.connection) ?? []), j])
  let sent = 0
  let failed = 0
  let broken = 0
  for (const [conn, list] of byConnection) {
    let g: Writer
    try {
      const token = (await rpc('calendar_token', { p_connection: conn })) as string
      g = calendarWriter(fetch, await accessToken(fetch, client, token))
    } catch (e) {
      if (e instanceof Broken) {
        await rpc('calendar_broken', { p_connection: conn, p_reason: e.message })
        broken += 1
      }
      for (const j of list)
        await rpc('calendar_unpushed', { p_outbox: j.outbox, p_error: String(e) })
      failed += list.length
      continue
    }
    for (const job of list) {
      try {
        if (job.item) {
          const { refs } = await pushItem(rpc, g, job)
          await rpc('calendar_pushed', { p_outbox: job.outbox, p_refs: refs })
        } else {
          const { refs, seriesRef } = await pushSeries(g, job)
          await rpc('calendar_pushed', {
            p_outbox: job.outbox,
            p_refs: refs,
            p_series_ref: seriesRef,
          })
        }
        sent += 1
      } catch (e) {
        await rpc('calendar_unpushed', { p_outbox: job.outbox, p_error: String(e).slice(0, 500) })
        failed += 1
      }
    }
  }
  return { jobs: jobs.length, sent, failed, broken }
}
