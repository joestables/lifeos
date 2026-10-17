import { expect, type Locator, type Page } from '@playwright/test'
import { typeByKey } from '../../packages/ontology/src/index.ts'
import { addDays } from '../../packages/recurrence/src/index.ts'
import { zonedInstant } from '../../src/lib/dates.ts'

/** The stand-in Supabase the e2e build points at (npm run build:e2e). */
export const STAND_IN_URL = 'https://stand-in.supabase.co'
const SESSION_KEY = 'sb-stand-in-auth-token'

export const ANN = {
  id: '00000000-0000-4000-8000-00000000000a',
  email: 'ann@example.com',
  name: 'Ann Example',
}

/** Rows the stand-in starts with (core tables, as PostgREST returns them). */
export interface Rows {
  items?: Record<string, unknown>[]
  labels?: { id: string; name: string }[]
  item_labels?: { item_id: string; label_id: string }[]
  marks?: { item_id: string }[]
  people?: Record<string, unknown>[]
  reminders?: Record<string, unknown>[]
  push_devices?: Record<string, unknown>[]
  subtasks?: { id: string; item_id: string; title: string; done: boolean; position: string }[]
  series?: Record<string, unknown>[]
  links?: { from_item: string; to_item: string; link_type: string }[]
  connections?: Record<string, unknown>[]
  calendar_links?: Record<string, unknown>[]
  external_refs?: Record<string, unknown>[]
  /** What connecting Google Calendar brings: its calendars and the main one's events. */
  google?: {
    account: string
    calendars: Record<string, unknown>[]
    events: Record<string, unknown>[]
  }
}

/** An Item row with everything but what a test names. */
export const itemRow = (fields: Record<string, unknown> & { id: string; type: string }) => ({
  title: '',
  body: null,
  place: null,
  space_id: 's',
  owner_id: ANN.id,
  status: 'active',
  starts_at: null,
  ends_at: null,
  all_day: null,
  due_on: null,
  do_on: null,
  do_at: null,
  slot: null,
  series_id: null,
  occurrence_on: null,
  position: null,
  touched_at: null,
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-01T09:00:00Z',
  archived_at: null,
  ...fields,
})

/**
 * Answers the app's Supabase calls without a server: the given rows, and the
 * writes the app sends change them as the database would, so a refresh shows
 * what was done. Sign-out succeeds. With signedIn, the page starts with
 * Ann's session. Returns the rows as they are now, for a test to check.
 */
export async function standIn(
  page: Page,
  { signedIn = false, rows = {} }: { signedIn?: boolean; rows?: Rows } = {},
) {
  const db = {
    items: [...(rows.items ?? [])],
    labels: (rows.labels ?? []).map((l) => ({
      space_id: 's',
      created_by: ANN.id,
      created_at: '',
      ...l,
    })),
    item_labels: [...(rows.item_labels ?? [])],
    marks: [...(rows.marks ?? [])],
    // My row, with the defaults the database gives.
    people: (rows.people ?? [{}]).map((p): Record<string, unknown> => ({
      timezone: 'Europe/London',
      default_reminder_time: '09:00:00',
      reminder_defaults: {},
      digest_on: true,
      digest_time: '07:00:00',
      plan_hidden_types: [],
      ...p,
    })),
    reminders: (rows.reminders ?? []).map((r): Record<string, unknown> => ({
      is_default: false,
      anchor: null,
      offset_days: 0,
      at_time: null,
      fixed_at: null,
      snoozed_until: null,
      ...r,
    })),
    push_devices: (rows.push_devices ?? []).map((d): Record<string, unknown> => ({
      label: '',
      enabled: true,
      gone_at: null,
      created_at: '2026-10-01T09:00:00Z',
      last_sent_at: null,
      ...d,
    })),
    subtasks: [...(rows.subtasks ?? [])],
    series: [...(rows.series ?? [])],
    links: [...(rows.links ?? [])],
    connections: [...(rows.connections ?? [])],
    calendar_links: [...(rows.calendar_links ?? [])],
    external_refs: [...(rows.external_refs ?? [])],
    /** The calendar chosen for each new Event (set_event_calendar). */
    event_calendars: [] as { item_id: string; calendar_link_id: string | null }[],
  }
  /** What the Edge Function calendar-connect does, without Google (GCL-001). */
  const calendar = (body: { action?: string }) => {
    const conn = db.connections[0]
    if (body.action === 'start') {
      const g = rows.google ?? { account: 'ann@gmail.com', calendars: [], events: [] }
      db.connections = [
        {
          id: 'conn',
          account: g.account,
          state: 'connected',
          broken_since: null,
          last_synced_at: new Date().toISOString(),
          disconnected_at: null,
        },
      ]
      db.calendar_links = g.calendars.map((c, i) => ({
        level: i === 0 ? 'incoming' : 'off',
        new_events: false,
        can_edit: true,
        is_primary: i === 0,
        ...c,
      }))
      for (const e of g.events) {
        db.items.push(itemRow({ type: 'event', ...e, id: String(e.id) }))
        db.external_refs.push({
          item_id: e.id,
          calendar_link_id: db.calendar_links[0]?.id,
          external_id: `g-${String(e.id)}`,
        })
      }
      return { url: '/settings?calendar=connected' }
    }
    if (!conn || conn.disconnected_at) return { connected: false }
    if (body.action === 'disconnect') {
      conn.disconnected_at = new Date().toISOString()
      for (const l of db.calendar_links) l.level = 'off'
      // Events I made in LifeOS stay (GCL-001 3).
      for (const r of db.external_refs)
        if (!r.made_in_lifeos) Object.assign(item(r.item_id) ?? {}, { archived_at: now() })
      return { connected: false }
    }
    conn.last_synced_at = new Date().toISOString()
    return { connections: 1, saved: 0, broken: 0, failed: [] }
  }
  const item = (id: unknown) => db.items.find((i) => i.id === id)
  const now = () => new Date().toISOString()
  // Repeats, as core.set_repeat, stop_repeat and complete_occurrence make them.
  const endSeries = (seriesId: unknown, last: string, keep?: unknown) => {
    for (const s of db.series)
      if (s.id === seriesId && (!s.ended_on || String(s.ended_on) > last)) s.ended_on = last
    for (const i of db.items)
      if (
        i.series_id === seriesId &&
        String(i.occurrence_on) > last &&
        !i.touched_at &&
        !i.archived_at &&
        (i.status === 'active' || i.status === 'idea') &&
        i.id !== keep
      )
        i.archived_at = now()
  }
  type Template = {
    title: string
    body?: string | null
    do_at?: string | null
    due_offset_days?: number | null
    place?: string | null
    start_time?: string | null
    duration_minutes?: number | null
    all_day?: boolean
    days?: number | null
    label_ids?: string[]
  }
  // An Event's times on a day, as core_private.make_occurrences makes them.
  const eventOn = (s: Record<string, unknown>, on: string) => {
    const t = s.template as Template
    if (t.all_day)
      return {
        do_on: null,
        all_day: true,
        starts_at: `${on}T00:00:00.000Z`,
        ends_at: `${addDays(on, t.days ?? 1)}T00:00:00.000Z`,
      }
    const start = zonedInstant(on, (t.start_time ?? '09:00').slice(0, 5), String(s.timezone))
    return {
      do_on: null,
      all_day: false,
      starts_at: start,
      ends_at: new Date(Date.parse(start) + (t.duration_minutes ?? 60) * 60_000).toISOString(),
    }
  }
  const occurrence = (s: Record<string, unknown>, id: string, on: string) => {
    if (item(id) || db.items.some((i) => i.series_id === s.id && i.occurrence_on === on)) return
    const t = s.template as Template
    db.items.push(
      itemRow({
        id,
        type: String(s.type ?? 'task'),
        title: t.title,
        body: t.body ?? null,
        ...(s.type === 'event'
          ? { place: t.place ?? null, ...eventOn(s, on) }
          : {
              do_on: on,
              do_at: t.do_at ?? null,
              due_on: t.due_offset_days == null ? null : addDays(on, t.due_offset_days),
            }),
        series_id: s.id,
        occurrence_on: on,
      }),
    )
    for (const label of t.label_ids ?? []) db.item_labels.push({ item_id: id, label_id: label })
  }
  const write: Record<string, (a: Record<string, unknown>) => unknown> = {
    // The sender's public key (a made-up one: nothing is really sent).
    vapid_public_key: () =>
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    register_device: (a) => {
      const existing = db.push_devices.find((d) => d.endpoint === a.p_endpoint)
      if (existing) return Object.assign(existing, { enabled: true, gone_at: null })
      db.push_devices.push({
        id: a.p_id,
        endpoint: a.p_endpoint,
        label: a.p_label,
        enabled: true,
        gone_at: null,
        created_at: now(),
        last_sent_at: null,
      })
    },
    set_device: (a) =>
      db.push_devices.filter((d) => d.id === a.p_id).forEach((d) => (d.enabled = a.p_enabled)),
    remove_device: (a) => {
      db.push_devices = db.push_devices.filter((d) => d.id !== a.p_id)
    },
    update_settings: (a) => {
      const patch = a.p_patch as Record<string, unknown>
      const me = db.people[0]!
      const { reminder_defaults, ...rest } = patch
      Object.assign(me, rest)
      if (reminder_defaults)
        me.reminder_defaults = {
          ...(me.reminder_defaults as object),
          ...(reminder_defaults as object),
        }
    },
    update_reminder: (a) =>
      db.reminders
        .filter((r) => r.id === a.p_id)
        .forEach((r) => Object.assign(r, a.p_patch, { is_default: false, snoozed_until: null })),
    create_item: (a) => {
      if (item(a.p_id)) return
      const at = new Date().toISOString()
      db.items.push(
        itemRow({
          id: String(a.p_id),
          type: String(a.p_type),
          created_at: at,
          updated_at: at,
          ...(a.p_fields as object),
        }),
      )
    },
    add_reminder: (a) => {
      const fields = a.p_fields as { fixed_at?: string }
      db.reminders.push({
        id: a.p_id,
        item_id: a.p_item,
        is_default: false,
        anchor: null,
        offset_days: 0,
        at_time: null,
        fixed_at: null,
        snoozed_until: null,
        fires_at: fields.fixed_at ?? null,
        ...fields,
      })
    },
    update_item: (a) => {
      const i = item(a.p_id)
      if (i?.series_id && !i.touched_at) i.touched_at = now()
      Object.assign(i ?? {}, a.p_patch as object, { updated_at: now() })
    },
    set_repeat: (a) => {
      const i = item(a.p_item)
      if (!i || i.series_id === a.p_series) return
      const occs = a.p_occurrences as { id: string; on: string }[]
      const t = a.p_template as Template
      if (i.series_id) endSeries(i.series_id, addDays(String(i.occurrence_on), -1), i.id)
      const s = {
        id: a.p_series,
        type: i.type,
        mode: a.p_mode,
        rule: a.p_rule,
        starts_on: a.p_starts_on,
        timezone: a.p_timezone,
        template: t,
        ended_on: null,
      }
      db.series.push(s)
      const first = occs[0]!.on
      Object.assign(i, {
        series_id: a.p_series,
        occurrence_on: first,
        ...(i.type === 'event'
          ? eventOn(s, first)
          : {
              do_on: first,
              do_at: t.do_at ?? null,
              due_on: t.due_offset_days == null ? null : addDays(first, t.due_offset_days),
            }),
        status: i.status === 'idea' ? 'active' : i.status,
        touched_at: null,
      })
      for (const o of occs.slice(1)) occurrence(s, o.id, o.on)
    },
    stop_repeat: (a) => {
      const i = item(a.p_item)
      if (i?.series_id) endSeries(i.series_id, String(i.occurrence_on))
    },
    complete_occurrence: (a) => {
      const i = item(a.p_id)
      if (!i) return
      Object.assign(i, { status: 'done', touched_at: i.touched_at ?? now(), updated_at: now() })
      const s = db.series.find((x) => x.id === i.series_id)
      if (s?.mode === 'after_completion' && !s.ended_on)
        occurrence(s, String(a.p_next), String(a.p_next_on))
    },
    remove_reminder: (a) => {
      db.reminders = db.reminders.filter((r) => r.id !== a.p_id)
    },
    archive_item: (a) =>
      Object.assign(item(a.p_id) ?? {}, { archived_at: new Date().toISOString() }),
    restore_item: (a) => Object.assign(item(a.p_id) ?? {}, { archived_at: null }),
    // The status is kept where the new Type has it, else active (ITM-004).
    convert_item: (a) => {
      const i = item(a.p_id)
      if (!i) return {}
      const keeps = (typeByKey(String(a.p_type))?.statuses as readonly string[]) ?? []
      return Object.assign(i, {
        type: a.p_type,
        status: keeps.includes(String(i.status)) ? i.status : 'active',
      })
    },
    create_label: (a) =>
      db.labels.push({
        id: String(a.p_id),
        name: String(a.p_name),
        space_id: 's',
        created_by: ANN.id,
        created_at: '',
      }),
    rename_label: (a) =>
      db.labels.filter((l) => l.id === a.p_id).forEach((l) => (l.name = String(a.p_name))),
    delete_label: (a) => {
      db.labels = db.labels.filter((l) => l.id !== a.p_id)
      db.item_labels = db.item_labels.filter((r) => r.label_id !== a.p_id)
    },
    add_subtask: (a) => {
      if (db.subtasks.some((x) => x.id === a.p_id)) return
      db.subtasks.push({
        id: String(a.p_id),
        item_id: String(a.p_item),
        title: String(a.p_title),
        done: false,
        position: String(a.p_position),
      })
    },
    update_subtask: (a) =>
      db.subtasks.filter((x) => x.id === a.p_id).forEach((x) => Object.assign(x, a.p_patch)),
    remove_subtask: (a) => {
      db.subtasks = db.subtasks.filter((x) => x.id !== a.p_id)
    },
    add_label: (a) => {
      if (!db.item_labels.some((r) => r.item_id === a.p_item && r.label_id === a.p_label))
        db.item_labels.push({ item_id: String(a.p_item), label_id: String(a.p_label) })
    },
    remove_label: (a) => {
      db.item_labels = db.item_labels.filter(
        (r) => !(r.item_id === a.p_item && r.label_id === a.p_label),
      )
    },
    // As core.search_items: every word starts a word of the title, a Label or
    // the body; title matches first. Only the ids, as the app asks.
    search_items: (a) => {
      const words = String(a.p_query)
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
      const has = (text: unknown, w: string) =>
        String(text ?? '')
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .some((x) => x.startsWith(w))
      const labelsOf = (id: unknown) =>
        db.item_labels
          .filter((r) => r.item_id === id)
          .map((r) => db.labels.find((l) => l.id === r.label_id)?.name)
          .join(' ')
      const score = (i: Record<string, unknown>) =>
        words.every((w) => has(i.title, w) || has(labelsOf(i.id), w) || has(i.body, w))
          ? words.filter((w) => has(i.title, w)).length + 1
          : 0
      if (words.length === 0) return []
      return db.items
        .filter((i) => !i.archived_at && score(i) > 0)
        .sort((x, y) => score(y) - score(x))
        .slice(0, Number(a.p_limit ?? 30))
        .map((i) => ({ id: i.id }))
    },
    link_items: (a) => {
      const same = (l: { from_item: string; to_item: string; link_type: string }) =>
        l.from_item === a.p_from && l.to_item === a.p_to && l.link_type === a.p_link_type
      if (!db.links.some(same))
        db.links.push({
          from_item: String(a.p_from),
          to_item: String(a.p_to),
          link_type: String(a.p_link_type),
        })
    },
    unlink_items: (a) => {
      db.links = db.links.filter(
        (l) => !(l.from_item === a.p_from && l.to_item === a.p_to && l.link_type === a.p_link_type),
      )
    },
    set_calendar_level: (a) => {
      const l = db.calendar_links.find((x) => x.id === a.p_link)
      if (!l) return
      l.level = a.p_level
      l.new_events = l.new_events && a.p_level === 'two_way'
      if (a.p_level === 'off')
        for (const r of db.external_refs)
          if (r.calendar_link_id === l.id && !r.made_in_lifeos)
            Object.assign(item(r.item_id) ?? {}, { archived_at: now() })
    },
    set_new_events_calendar: (a) => {
      for (const l of db.calendar_links) l.new_events = l.id === a.p_link
    },
    set_event_calendar: (a) => {
      db.event_calendars.push({
        item_id: String(a.p_item),
        calendar_link_id: (a.p_link as string | null) ?? null,
      })
    },
    set_mark: (a) => {
      db.marks = db.marks.filter((m) => m.item_id !== a.p_item)
      if (a.p_on) db.marks.push({ item_id: String(a.p_item) })
    },
  }
  await page.route(`${STAND_IN_URL}/**`, (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (url.pathname.endsWith('/functions/v1/calendar-connect'))
      return route.fulfill({ json: calendar(route.request().postDataJSON() ?? {}) })
    const rpc = url.pathname.match(/\/rest\/v1\/rpc\/(\w+)$/)
    if (rpc) {
      const result = write[rpc[1]!]?.(route.request().postDataJSON() ?? {})
      return route.fulfill({
        json: typeof result === 'string' || Array.isArray(result) ? result : null,
      })
    }
    const table = url.pathname.match(/\/rest\/v1\/(\w+)$/)?.[1]
    if (table) return route.fulfill({ json: db[table as keyof typeof db] ?? [] })
    return route.fulfill({ status: 404, json: {} })
  })
  if (signedIn) {
    const session = {
      access_token: 'stand-in',
      refresh_token: 'stand-in',
      token_type: 'bearer',
      expires_in: 3600,
      // Years ahead, so a test's fixed clock never finds it expired.
      expires_at: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600,
      user: {
        id: ANN.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: ANN.email,
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: ANN.name },
        created_at: '2026-10-09T00:00:00Z',
      },
    }
    await page.addInitScript(
      ([key, value]) => {
        if (!sessionStorage.getItem('stand-in-signed-out')) localStorage.setItem(key, value)
      },
      [SESSION_KEY, JSON.stringify(session)],
    )
  }
  return db
}

/** Puts writes in the queue before the app loads, as if made offline earlier. */
export async function queuedWrites(page: Page, count: number) {
  await page.addInitScript((n) => {
    const open = indexedDB.open('lifeos-queue')
    open.onupgradeneeded = () => open.result.createObjectStore('entries')
    open.onsuccess = () => {
      const tx = open.result.transaction('entries', 'readwrite')
      for (let i = 0; i < n; i++) {
        const id = `01a12254-e799-75ba-8d62-cb5f3f9e09${String(i).padStart(2, '0')}`
        tx.objectStore('entries').put(
          {
            id,
            fn: 'create_item',
            args: { p_id: id, p_type: 'thought' },
            itemIds: [id],
            createdAt: Date.now(),
            attempts: 0,
            state: 'failed',
            error: 'stand-in',
          },
          id,
        )
      }
    }
  }, count)
}

/**
 * Stands in for the browser's push service: notifications allowed, and a
 * subscription made on asking, as if LifeOS were installed on an Android
 * phone (REM-001). Nothing is really sent.
 */
export async function pushAllowed(
  page: Page,
  endpoint = 'https://push.example/this-device',
  { subscribed: already = false } = {},
) {
  await page.addInitScript(
    ([endpoint, already]) => {
      const sub = {
        endpoint,
        toJSON: () => ({ endpoint, keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
        unsubscribe: async () => {
          subscribed = false
          return true
        },
      }
      let subscribed = already
      let permission: NotificationPermission = 'default'
      Object.defineProperty(Notification, 'permission', { get: () => permission })
      Notification.requestPermission = async () => (permission = 'granted')
      PushManager.prototype.getSubscription = async () =>
        (subscribed ? sub : null) as unknown as PushSubscription
      PushManager.prototype.subscribe = async () => {
        subscribed = true
        return sub as unknown as PushSubscription
      }
    },
    [endpoint, already] as const,
  )
}

/** Picks a time from a TimeField (a Select of quarter hours), then waits for it to close. */
export async function pickTime(field: Locator, time: string) {
  await field.click()
  const page = field.page()
  await page.getByRole('option', { name: time, exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
}
