import type { Page } from '@playwright/test'

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
  }
  const item = (id: unknown) => db.items.find((i) => i.id === id)
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
    update_item: (a) => Object.assign(item(a.p_id) ?? {}, a.p_patch as object),
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
      expires_at: Math.floor(Date.now() / 1000) + 3600,
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
