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
  /** The food schema's tables (ADR-0052), as PostgREST returns them. */
  recipe?: Record<string, unknown>[]
  variation?: Record<string, unknown>[]
  variation_lines?: Record<string, unknown>[]
  variation_steps?: Record<string, unknown>[]
  cooks?: Record<string, unknown>[]
  pantry?: Record<string, unknown>[]
  /** Meals' own fields (food.meal): servings, leftovers_of, source. */
  meal?: Record<string, unknown>[]
  /** Meals' own lines (MPL-006). */
  meal_lines?: Record<string, unknown>[]
  /** My Spaces' staples (PAN-002); my personal Space is `s`. */
  staples?: Record<string, unknown>[]
  values?: Record<string, unknown>[]
  activity?: Record<string, unknown>[]
  /** Photos (core.attachments) and their files in Storage's `photos` bucket. */
  attachments?: Record<string, unknown>[]
  change_notes?: Record<string, unknown>[]
  /** Households (HSH-001–004): their Spaces, members (with names), and invitations. */
  spaces?: { id: string; name: string; created_by: string }[]
  space_members?: {
    space_id: string
    person_id: string
    role: 'owner' | 'member'
    name: string
    joined_at?: string
  }[]
  /** Invitations sent by the owners of Households I'm in. */
  space_invites?: Record<string, unknown>[]
  /** Invitations waiting for me, as core.my_invites() returns them. */
  my_invites?: Record<string, unknown>[]
  /**
   * What the `ai` Edge Function answers (ADR-0054): whether it can be used,
   * and an import's answer. Never Gemini: walks don't call the AI.
   */
  ai?: {
    status?: Record<string, unknown>
    import?: Record<string, unknown>
    fill?: Record<string, unknown>
    meal?: Record<string, unknown>
  }
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
  { signedIn = false, rows = {}, ai }: { signedIn?: boolean; rows?: Rows; ai?: Rows['ai'] } = {},
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
    recipe: (rows.recipe ?? []).map((r): Record<string, unknown> => ({
      category: null,
      cuisine: null,
      tags: [],
      protein: [],
      carbs: [],
      default_variation: null,
      ...r,
    })),
    variation: (rows.variation ?? []).map((v): Record<string, unknown> => ({
      servings: null,
      prep_min: null,
      cook_min: null,
      sources: [],
      notes: null,
      archived_from: null,
      ...v,
    })),
    variation_lines: (rows.variation_lines ?? []).map((l): Record<string, unknown> => ({
      heading: null,
      pantry_id: null,
      text: null,
      qty: null,
      qty_max: null,
      approx: false,
      unit: null,
      ...l,
    })),
    variation_steps: [...(rows.variation_steps ?? [])],
    cooks: [...(rows.cooks ?? [])],
    pantry: [...(rows.pantry ?? [])],
    staples: [...(rows.staples ?? [])],
    meal: [...(rows.meal ?? [])].map((m): Record<string, unknown> => ({ source: null, ...m })),
    meal_lines: (rows.meal_lines ?? []).map((l): Record<string, unknown> => ({
      pantry_id: null,
      text: null,
      qty: null,
      qty_max: null,
      approx: false,
      unit: null,
      ...l,
    })),
    spaces: [
      { id: 's', kind: 'personal', name: '', created_by: ANN.id },
      ...(rows.spaces ?? []).map((h) => ({ kind: 'household', ...h })),
    ] as Record<string, unknown>[],
    space_members: (rows.space_members ?? []).map((m) => ({
      joined_at: '2026-10-01T09:00:00Z',
      ...m,
    })) as Record<string, unknown>[],
    space_invites: [...(rows.space_invites ?? [])],
    my_invites: [...(rows.my_invites ?? [])],
    values: [...(rows.values ?? [])],
    activity: [...(rows.activity ?? [])],
    attachments: [...(rows.attachments ?? [])],
    change_notes: [...(rows.change_notes ?? [])],
    /** Storage's `photos` bucket: each file's bytes by its path. */
    files: new Map<string, Buffer>(),
    /** The calendar chosen for each new Event (set_event_calendar). */
    event_calendars: [] as { item_id: string; calendar_link_id: string | null }[],
    /** What was asked of the `ai` Edge Function. */
    ai_asked: [] as Record<string, unknown>[],
  }
  /** What the Edge Function calendar-connect does, without Google (GCL-001). */
  const calendar = (body: { action?: string; code?: string }) => {
    const conn = db.connections[0]
    // Google's consent page and callback, skipped: back to Settings to finish.
    if (body.action === 'start') return { url: '/settings?calendar=finish&code=c-1' }
    if (body.action === 'finish') {
      if (body.code !== 'c-1') throw new Error('expired')
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
      return { connected: true }
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
  // Food, as the food schema's functions and triggers do it (ADR-0011, ADR-0052).
  const recipeOf = (variation: unknown) =>
    db.links.find((l) => l.from_item === variation && l.link_type === 'variation_of')?.to_item
  const variationsOf = (recipe: unknown) =>
    db.links
      .filter((l) => l.to_item === recipe && l.link_type === 'variation_of')
      .map((l) => item(l.from_item))
      .filter((v): v is Record<string, unknown> => Boolean(v && !v.archived_at))
  // The highest live Variation's state; Archived only when all are.
  const derive = (recipe: unknown) => {
    const r = item(recipe)
    const vs = variationsOf(recipe)
    if (!r || !vs.length) return
    const has = (s: string) => vs.some((v) => v.status === s)
    r.status = has('done') ? 'done' : has('active') ? 'active' : has('idea') ? 'idea' : 'cancelled'
  }
  let activityId = db.activity.length
  const log = (item_id: unknown, changed: Record<string, unknown>, verb = 'updated') =>
    db.activity.push({ id: ++activityId, item_id, verb, changed, at: now(), actor: ANN.id })
  const changes = (row: Record<string, unknown>, patch: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(patch)
        .filter(([k, v]) => JSON.stringify(row[k] ?? null) !== JSON.stringify(v ?? null))
        .map(([k, v]) => [k, { from: row[k] ?? null, to: v ?? null }]),
    )
  const lineRow = (l: Record<string, unknown>) => {
    const rest = { ...l }
    delete rest.variation_id
    return rest
  }
  const foodWrite: Record<string, (a: Record<string, unknown>) => unknown> = {
    create_recipe: (a) => {
      if (item(a.p_id)) return
      const at = now()
      const status = String(a.p_status ?? 'idea')
      db.items.push(
        itemRow({
          id: String(a.p_id),
          type: 'recipe',
          title: String(a.p_name).trim(),
          status,
          created_at: at,
          updated_at: at,
        }),
        itemRow({
          id: String(a.p_variation),
          type: 'variation',
          title: String(a.p_variation_name ?? 'Standard'),
          status,
          created_at: at,
          updated_at: at,
        }),
      )
      db.links.push({
        from_item: String(a.p_variation),
        to_item: String(a.p_id),
        link_type: 'variation_of',
      })
      db.recipe.push({
        item_id: a.p_id,
        category: null,
        cuisine: null,
        tags: [],
        protein: [],
        carbs: [],
        default_variation: a.p_variation,
      })
      db.variation.push({
        item_id: a.p_variation,
        servings: null,
        prep_min: null,
        cook_min: null,
        sources: [],
        notes: null,
        archived_from: null,
      })
      log(a.p_id, { type: 'recipe' }, 'created')
      log(a.p_variation, { type: 'variation' }, 'created')
    },
    update_recipe: (a) => {
      const r = db.recipe.find((x) => x.item_id === a.p_id)
      if (!r) return
      const patch = a.p_patch as Record<string, unknown>
      const c = changes(r, patch)
      Object.assign(r, patch)
      if (Object.keys(c).length) log(a.p_id, c)
    },
    add_variation: (a) => {
      if (item(a.p_id)) return
      const from = a.p_from ? item(a.p_from) : undefined
      const at = now()
      db.items.push(
        itemRow({
          id: String(a.p_id),
          type: 'variation',
          title: String(a.p_name),
          status: from ? 'active' : 'idea',
          created_at: at,
          updated_at: at,
        }),
      )
      db.links.push({
        from_item: String(a.p_id),
        to_item: String(a.p_recipe),
        link_type: 'variation_of',
      })
      const fields = db.variation.find((v) => v.item_id === a.p_from)
      db.variation.push({
        ...(fields ?? { servings: null, prep_min: null, cook_min: null, sources: [], notes: null }),
        item_id: a.p_id,
        archived_from: null,
      })
      if (from) {
        for (const l of db.variation_lines.filter((x) => x.variation_id === a.p_from))
          db.variation_lines.push({
            ...l,
            id:
              (a.p_ids as Record<string, string> | undefined)?.[String(l.id)] ??
              crypto.randomUUID(),
            variation_id: a.p_id,
          })
        for (const st of db.variation_steps.filter((x) => x.variation_id === a.p_from))
          db.variation_steps.push({
            ...st,
            id:
              (a.p_ids as Record<string, string> | undefined)?.[String(st.id)] ??
              crypto.randomUUID(),
            variation_id: a.p_id,
          })
      }
      log(a.p_id, { type: 'variation' }, 'created')
      derive(a.p_recipe)
    },
    update_variation: (a) => {
      const v = db.variation.find((x) => x.item_id === a.p_id)
      if (!v) return
      const patch = a.p_patch as Record<string, unknown>
      const c = changes(v, patch)
      Object.assign(v, patch)
      if (Object.keys(c).length) log(a.p_id, c)
    },
    add_line: (a) => {
      if (db.variation_lines.some((l) => l.id === a.p_id)) return
      const l = {
        heading: null,
        pantry_id: null,
        text: null,
        qty: null,
        qty_max: null,
        approx: false,
        unit: null,
        ...(a.p_fields as object),
        id: a.p_id,
        variation_id: a.p_variation,
      }
      db.variation_lines.push(l)
      log(a.p_variation, { line: { from: null, to: lineRow(l) } })
    },
    update_line: (a) => {
      const l = db.variation_lines.find((x) => x.id === a.p_id)
      if (!l) return
      const before = lineRow({ ...l })
      Object.assign(l, a.p_patch)
      log(l.variation_id, { line: { from: before, to: lineRow(l) } })
    },
    remove_line: (a) => {
      const l = db.variation_lines.find((x) => x.id === a.p_id)
      db.variation_lines = db.variation_lines.filter((x) => x.id !== a.p_id)
      if (l) log(l.variation_id, { line: { from: lineRow(l), to: null } })
    },
    add_step: (a) => {
      if (db.variation_steps.some((x) => x.id === a.p_id)) return
      const st = { id: a.p_id, variation_id: a.p_variation, text: a.p_text, position: a.p_position }
      db.variation_steps.push(st)
      log(a.p_variation, { step: { from: null, to: lineRow(st) } })
    },
    update_step: (a) => {
      const st = db.variation_steps.find((x) => x.id === a.p_id)
      if (!st) return
      const before = lineRow({ ...st })
      Object.assign(st, a.p_patch)
      log(st.variation_id, { step: { from: before, to: lineRow(st) } })
    },
    remove_step: (a) => {
      const st = db.variation_steps.find((x) => x.id === a.p_id)
      db.variation_steps = db.variation_steps.filter((x) => x.id !== a.p_id)
      if (st) log(st.variation_id, { step: { from: lineRow(st), to: null } })
    },
    log_cook: (a) => {
      if (db.cooks.some((c) => c.id === a.p_id)) return
      const f = a.p_fields as Record<string, unknown>
      const v = item(a.p_variation)
      const fields = db.variation.find((x) => x.item_id === a.p_variation)
      db.cooks.push({
        id: a.p_id,
        variation_id: a.p_variation,
        person_id: ANN.id,
        cooked_at: f.cooked_at ?? now(),
        verdict: f.verdict ?? null,
        notes: f.notes ?? null,
        servings: f.servings ?? null,
        meal_id: null,
        created_at: now(),
        snapshot: {
          name: v?.title,
          servings: fields?.servings ?? null,
          lines: db.variation_lines
            .filter((l) => l.variation_id === a.p_variation)
            .map((l) => ({
              ...l,
              name: db.pantry.find((p) => p.id === l.pantry_id)?.name ?? l.text,
            })),
          steps: db.variation_steps
            .filter((x) => x.variation_id === a.p_variation)
            .map((x) => x.text),
        },
      })
    },
    update_cook: (a) =>
      db.cooks.filter((c) => c.id === a.p_id).forEach((c) => Object.assign(c, a.p_patch)),
    remove_cook: (a) => {
      db.cooks = db.cooks.filter((c) => c.id !== a.p_id)
    },
    add_pantry: (a) => {
      if (db.pantry.some((p) => p.id === a.p_id)) return
      const f = a.p_fields as Record<string, unknown>
      const kind = String(f.kind ?? 'ingredient')
      db.pantry.push({
        id: a.p_id,
        name: f.name,
        kind,
        aisle: kind === 'ingredient' ? (f.aisle ?? 'cupboard') : null,
        default_unit: f.default_unit ?? null,
        added_by: ANN.id,
      })
    },
    plan_meal: (a) => {
      if (item(a.p_id)) return
      const f = a.p_fields as Record<string, unknown>
      const at = now()
      db.items.push(
        itemRow({
          id: String(a.p_id),
          type: 'meal',
          title: String(f.title ?? '').trim(),
          do_on: f.do_on ?? null,
          slot: f.slot ?? null,
          status: 'active',
          ...(f.space_id ? { space_id: f.space_id } : {}),
          created_at: at,
          updated_at: at,
        }),
      )
      db.meal.push({
        item_id: a.p_id,
        servings: f.servings ?? null,
        leftovers_of: f.leftovers_of ?? null,
        source: f.source ?? null,
      })
      if (f.variation)
        db.links.push({
          from_item: String(a.p_id),
          to_item: String(f.variation),
          link_type: 'uses',
        })
    },
    update_meal: (a) =>
      db.meal.filter((m) => m.item_id === a.p_id).forEach((m) => Object.assign(m, a.p_patch)),
    add_meal_line: (a) => {
      if (db.meal_lines.some((l) => l.id === a.p_id)) return
      db.meal_lines.push({
        pantry_id: null,
        text: null,
        qty: null,
        qty_max: null,
        approx: false,
        unit: null,
        ...(a.p_fields as object),
        id: a.p_id,
        meal_id: a.p_meal,
      })
    },
    update_meal_line: (a) =>
      db.meal_lines.filter((l) => l.id === a.p_id).forEach((l) => Object.assign(l, a.p_patch)),
    remove_meal_line: (a) => {
      db.meal_lines = db.meal_lines.filter((l) => l.id !== a.p_id)
    },
    set_meal_variation: (a) => {
      db.links = db.links.filter((l) => !(l.from_item === a.p_meal && l.link_type === 'uses'))
      if (a.p_variation)
        db.links.push({
          from_item: String(a.p_meal),
          to_item: String(a.p_variation),
          link_type: 'uses',
        })
    },
    update_pantry: (a) => {
      const p = db.pantry.find((x) => x.id === a.p_id)
      if (!p) return
      const f = a.p_patch as Record<string, unknown>
      Object.assign(p, f)
      if (p.kind === 'household') p.aisle = null
      else p.aisle ??= 'cupboard'
    },
    remove_pantry: (a) => {
      // Refused while any line uses it, as the foreign key does (PAN-001 4).
      if ([...db.variation_lines, ...db.meal_lines].some((l) => l.pantry_id === a.p_id))
        return 'in use'
      db.pantry = db.pantry.filter((p) => p.id !== a.p_id)
      db.staples = db.staples.filter((x) => x.pantry_id !== a.p_id)
    },
    merge_pantry: (a) => {
      for (const l of db.variation_lines) if (l.pantry_id === a.p_merge) l.pantry_id = a.p_keep
      for (const x of db.staples.filter((x) => x.pantry_id === a.p_merge)) {
        const kept = db.staples.find((k) => k.space_id === x.space_id && k.pantry_id === a.p_keep)
        if (kept) kept.out_of_stock = Boolean(kept.out_of_stock) || Boolean(x.out_of_stock)
        else db.staples.push({ ...x, pantry_id: a.p_keep })
      }
      db.staples = db.staples.filter((x) => x.pantry_id !== a.p_merge)
      db.pantry = db.pantry.filter((p) => p.id !== a.p_merge)
    },
    set_staple: (a) => {
      db.staples = db.staples.filter(
        (x) => !(x.space_id === a.p_space && x.pantry_id === a.p_pantry),
      )
      if (a.p_staple)
        db.staples.push({
          space_id: a.p_space,
          pantry_id: a.p_pantry,
          out_of_stock: Boolean(a.p_out_of_stock),
        })
    },
    note_change: (a) => {
      db.change_notes = db.change_notes.filter((n) => n.activity_id !== a.p_activity)
      const note = String(a.p_note ?? '').trim()
      const act = db.activity.find((x) => x.id === a.p_activity)
      if (note && act)
        db.change_notes.push({ activity_id: a.p_activity, item_id: act.item_id, note })
    },
    // An import kept all together (RCP-014 3, 4), from the writes above.
    keep_import: (a) => {
      const d = a.p_draft as Record<string, unknown>
      const recipe = String(a.p_recipe)
      const v = String(a.p_variation)
      const idea = item(recipe)
      if (idea && idea.status !== 'idea') return
      if (!idea)
        foodWrite.create_recipe!({
          p_id: recipe,
          p_variation: v,
          p_name: d.name,
          p_status: 'active',
        })
      foodWrite.update_recipe!({
        p_id: recipe,
        p_patch: { category: d.category, cuisine: d.cuisine, protein: d.protein, carbs: d.carbs },
      })
      for (const [kind, names] of [
        ['category', [d.category]],
        ['cuisine', [d.cuisine]],
        ['protein', d.protein],
        ['carb', d.carbs],
      ] as [string, string[]][])
        for (const name of names)
          if (
            !db.values.some(
              (x) => x.kind === kind && String(x.name).toLowerCase() === name.toLowerCase(),
            )
          )
            foodWrite.add_value!({ p_id: `value-${kind}-${name}`, p_kind: kind, p_name: name })
      const was = db.variation.find((x) => x.item_id === v)
      foodWrite.update_variation!({
        p_id: v,
        p_patch: {
          servings: d.servings,
          prep_min: d.prep_min,
          cook_min: d.cook_min,
          notes: [was?.notes, d.notes].filter(Boolean).join('\n\n') || null,
          sources: [
            ...new Set([...((was?.sources as string[]) ?? []), ...(d.sources as string[])]),
          ],
        },
      })
      for (const [i, l] of (d.lines as Record<string, unknown>[]).entries()) {
        const { new_pantry: added, ...fields } = l as { new_pantry?: Record<string, unknown> }
        if (added) {
          const found = db.pantry.find(
            (p) => String(p.name).toLowerCase() === String(added.name).toLowerCase(),
          )
          if (!found) foodWrite.add_pantry!({ p_id: added.id, p_fields: added })
          Object.assign(fields, { pantry_id: found?.id ?? added.id })
        }
        foodWrite.add_line!({ p_id: `${v}-line-${i}`, p_variation: v, p_fields: fields })
      }
      for (const [i, st] of (d.steps as { position: string; text: string }[]).entries())
        foodWrite.add_step!({
          p_id: `${v}-step-${i}`,
          p_variation: v,
          p_text: st.text,
          p_position: st.position,
        })
      if (idea) {
        item(v)!.status = 'active'
        idea.status = 'active'
      }
      return item(recipe)
    },
    add_value: (a) => {
      if (!db.values.some((v) => v.id === a.p_id))
        db.values.push({
          id: a.p_id,
          person_id: ANN.id,
          kind: a.p_kind,
          name: a.p_name,
          created_at: now(),
        })
    },
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
      const patch = a.p_patch as Record<string, unknown>
      const was = i?.status
      if (i && (i.type === 'recipe' || i.type === 'variation')) {
        const c = changes(i, patch)
        if (Object.keys(c).length) log(i.id, c)
      }
      Object.assign(i ?? {}, patch, { updated_at: now() })
      if (!i || patch.status === undefined || patch.status === was) return
      // Archiving a Recipe archives its Variations, remembering each; bringing it back restores them.
      if (i.type === 'recipe' && patch.status === 'cancelled') {
        for (const v of variationsOf(i.id)) {
          const f = db.variation.find((x) => x.item_id === v.id)
          if (v.status !== 'cancelled') {
            if (f) f.archived_from = v.status
            v.status = 'cancelled'
          }
        }
      } else if (i.type === 'recipe' && was === 'cancelled') {
        for (const v of variationsOf(i.id)) {
          const f = db.variation.find((x) => x.item_id === v.id)
          if (f?.archived_from) {
            v.status = f.archived_from
            f.archived_from = null
          }
        }
        derive(i.id)
      } else if (i.type === 'variation') derive(recipeOf(i.id))
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
      // Sorted into a Recipe, an Idea with a first Variation holding its text and links (RCP-002 4).
      if (a.p_type === 'recipe' && i.type !== 'recipe') {
        const v = `${String(i.id)}:v`
        const text = `${String(i.title)} ${String(i.body ?? '')}`
        db.items.push(itemRow({ id: v, type: 'variation', title: 'Standard', status: 'idea' }))
        db.links.push({ from_item: v, to_item: String(i.id), link_type: 'variation_of' })
        db.recipe.push({
          item_id: i.id,
          category: null,
          cuisine: null,
          tags: [],
          protein: [],
          carbs: [],
          default_variation: v,
        })
        db.variation.push({
          item_id: v,
          servings: null,
          prep_min: null,
          cook_min: null,
          sources: text.match(/https?:\/\/[^\s<>"]+/g) ?? [],
          notes: i.body ?? null,
          archived_from: null,
        })
        return Object.assign(i, { type: 'recipe', status: 'idea', body: null })
      }
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
    set_photo: (a) => {
      if (db.attachments.some((x) => x.id === a.p_id)) return
      db.attachments = db.attachments.filter((x) => x.item_id !== a.p_item)
      db.attachments.push({
        id: a.p_id,
        item_id: a.p_item,
        kind: 'photo',
        path: `${String(a.p_item)}/${String(a.p_id)}.webp`,
        width: a.p_width,
        height: a.p_height,
      })
    },
    remove_photo: (a) => {
      db.attachments = db.attachments.filter((x) => x.item_id !== a.p_item)
    },
    set_mark: (a) => {
      db.marks = db.marks.filter((m) => m.item_id !== a.p_item)
      if (a.p_on) db.marks.push({ item_id: String(a.p_item) })
    },
    // Households (HSH-001–004): what the database's functions do, without parting Items.
    create_household: (a) => {
      if (db.spaces.some((s) => s.id === a.p_id)) return
      db.spaces.push({ id: a.p_id, kind: 'household', name: a.p_name, created_by: ANN.id })
      db.space_members.push({
        space_id: a.p_id,
        person_id: ANN.id,
        role: 'owner',
        name: ANN.name,
        joined_at: now(),
      })
    },
    rename_household: (a) =>
      db.spaces.filter((s) => s.id === a.p_id).forEach((s) => (s.name = a.p_name)),
    invite: (a) => {
      if (db.space_invites.some((i) => i.space_id === a.p_space && i.email === a.p_email)) return
      db.space_invites.push({
        id: a.p_id,
        space_id: a.p_space,
        email: a.p_email,
        created_at: now(),
      })
    },
    withdraw_invite: (a) => {
      db.space_invites = db.space_invites.filter((i) => i.id !== a.p_id)
    },
    my_invites: () => db.my_invites,
    join_household: (a) => {
      const inv = db.my_invites.find((i) => i.id === a.p_invite)
      if (!inv) return
      db.my_invites = db.my_invites.filter((i) => i.id !== a.p_invite)
      if (!db.spaces.some((s) => s.id === inv.space_id))
        db.spaces.push({ id: inv.space_id, kind: 'household', name: inv.space_name })
      db.space_members.push({
        space_id: inv.space_id,
        person_id: ANN.id,
        role: 'member',
        name: ANN.name,
        joined_at: now(),
      })
    },
    decline_invite: (a) => {
      db.my_invites = db.my_invites.filter((i) => i.id !== a.p_invite)
    },
    leave_household: (a) => {
      db.space_members = db.space_members.filter(
        (m) => !(m.space_id === a.p_id && m.person_id === ANN.id),
      )
      db.spaces = db.spaces.filter((s) => s.id !== a.p_id)
    },
    remove_member: (a) => {
      db.space_members = db.space_members.filter(
        (m) => !(m.space_id === a.p_space && m.person_id === a.p_person),
      )
    },
    delete_household: (a) => {
      db.space_members = db.space_members.filter((m) => m.space_id !== a.p_id)
      db.space_invites = db.space_invites.filter((i) => i.space_id !== a.p_id)
      db.spaces = db.spaces.filter((s) => s.id !== a.p_id)
    },
  }
  /** My Households, each with its members and their names, as PostgREST embeds them. */
  const households = () =>
    db.spaces
      .filter((s) => s.kind === 'household')
      .sort((x, y) => String(x.name).localeCompare(String(y.name)))
      .map((s) => ({
        id: s.id,
        name: s.name,
        space_members: db.space_members
          .filter((m) => m.space_id === s.id)
          .map((m) => ({
            person_id: m.person_id,
            role: m.role,
            joined_at: m.joined_at,
            people: { name: m.name },
          })),
      }))
  await page.route(`${STAND_IN_URL}/**`, (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (url.pathname.endsWith('/functions/v1/ai')) {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      db.ai_asked.push(body)
      return route.fulfill({
        json:
          body.task === 'status'
            ? (ai?.status ?? { available: true, left: 30 })
            : body.task === 'recipe.fill_lines'
              ? (ai?.fill ?? { ok: false, reason: 'not_recipe' })
              : body.task === 'meal.ingredients'
                ? (ai?.meal ?? { ok: false, reason: 'not_recipe' })
                : (ai?.import ?? { ok: false, reason: 'not_recipe' }),
      })
    }
    if (url.pathname.endsWith('/functions/v1/calendar-connect'))
      try {
        return route.fulfill({ json: calendar(route.request().postDataJSON() ?? {}) })
      } catch {
        return route.fulfill({ status: 410, json: { error: 'Expired' } })
      }
    // Storage's `photos` bucket: upload, signed links, the files, removing.
    const stored = url.pathname.match(/\/storage\/v1\/object\/(sign\/)?photos\/?(.*)$/)
    if (stored) {
      const [, sign, path] = stored
      const method = route.request().method()
      if (sign && !path) {
        const { paths } = route.request().postDataJSON() as { paths: string[] }
        return route.fulfill({
          json: paths.map((p) => ({
            path: p,
            signedURL: `/object/sign/photos/${p}?token=stand-in`,
            error: db.files.has(p) ? null : 'Not found',
          })),
        })
      }
      if (sign) {
        const file = db.files.get(decodeURIComponent(path!))
        return file
          ? route.fulfill({ body: file, contentType: 'image/webp' })
          : route.fulfill({ status: 404, json: {} })
      }
      if (method === 'POST') {
        db.files.set(decodeURIComponent(path!), route.request().postDataBuffer() ?? Buffer.from(''))
        return route.fulfill({ json: { Key: `photos/${path}`, Id: path } })
      }
      if (method === 'DELETE') {
        const { prefixes } = route.request().postDataJSON() as { prefixes: string[] }
        for (const p of prefixes) db.files.delete(p)
        return route.fulfill({ json: [] })
      }
    }
    const rpc = url.pathname.match(/\/rest\/v1\/rpc\/(\w+)$/)
    if (rpc) {
      // The food schema's functions come with its profile (supabase.schema('food')).
      const food = route.request().headers()['content-profile'] === 'food'
      const result = (food ? foodWrite : write)[rpc[1]!]?.(route.request().postDataJSON() ?? {})
      if (result === 'in use')
        return route.fulfill({
          status: 409,
          json: { code: '23503', message: 'still referenced', details: null, hint: null },
        })
      return route.fulfill({
        json: typeof result === 'string' || Array.isArray(result) ? result : null,
      })
    }
    const table = url.pathname.match(/\/rest\/v1\/(\w+)$/)?.[1]
    if (table === 'spaces' && url.searchParams.get('select')?.includes('space_members'))
      return route.fulfill({ json: households() })
    if (table) {
      let rows = db[table as keyof typeof db] ?? []
      // Spaces are asked for by kind and maker (my Personal one): filtered as PostgREST would.
      if (table === 'spaces' && Array.isArray(rows))
        for (const [k, v] of url.searchParams)
          if (v.startsWith('eq.'))
            rows = (rows as Record<string, unknown>[]).filter((r) => String(r[k]) === v.slice(3))
      // .single() / .maybeSingle(): one row, as PostgREST sends it.
      if (route.request().headers()['accept']?.includes('vnd.pgrst.object'))
        return route.fulfill({ json: (Array.isArray(rows) ? rows[0] : rows) ?? null })
      return route.fulfill({ json: rows })
    }
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
