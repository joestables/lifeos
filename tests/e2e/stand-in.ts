import type { Page } from '@playwright/test'
import { addDays } from '../../packages/recurrence/src/index.ts'

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
  people?: { timezone: string; default_reminder_time: string }[]
  reminders?: { id: string; item_id: string; fires_at: string; is_default: boolean }[]
  subtasks?: { id: string; item_id: string; title: string; done: boolean; position: string }[]
  series?: Record<string, unknown>[]
}

/** An Item row with everything but what a test names. */
export const itemRow = (fields: Record<string, unknown> & { id: string; type: string }) => ({
  title: '',
  body: null,
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
    people: [...(rows.people ?? [])],
    reminders: [...(rows.reminders ?? [])] as Record<string, unknown>[],
    subtasks: [...(rows.subtasks ?? [])],
    series: [...(rows.series ?? [])],
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
    label_ids?: string[]
  }
  const occurrence = (s: Record<string, unknown>, id: string, on: string) => {
    if (item(id) || db.items.some((i) => i.series_id === s.id && i.occurrence_on === on)) return
    const t = s.template as Template
    db.items.push(
      itemRow({
        id,
        type: 'task',
        title: t.title,
        body: t.body ?? null,
        do_on: on,
        do_at: t.do_at ?? null,
        due_on: t.due_offset_days == null ? null : addDays(on, t.due_offset_days),
        series_id: s.id,
        occurrence_on: on,
      }),
    )
    for (const label of t.label_ids ?? []) db.item_labels.push({ item_id: id, label_id: label })
  }
  const write: Record<string, (a: Record<string, unknown>) => void> = {
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
      db.reminders.push({ id: a.p_id, item_id: a.p_item, fires_at: fields.fixed_at, ...fields })
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
        do_on: first,
        do_at: t.do_at ?? null,
        due_on: t.due_offset_days == null ? null : addDays(first, t.due_offset_days),
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
    convert_item: (a) => Object.assign(item(a.p_id) ?? {}, { type: a.p_type }),
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
    set_mark: (a) => {
      db.marks = db.marks.filter((m) => m.item_id !== a.p_item)
      if (a.p_on) db.marks.push({ item_id: String(a.p_item) })
    },
  }
  await page.route(`${STAND_IN_URL}/**`, (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    const rpc = url.pathname.match(/\/rest\/v1\/rpc\/(\w+)$/)
    if (rpc) {
      write[rpc[1]!]?.(route.request().postDataJSON() ?? {})
      return route.fulfill({ json: null })
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
