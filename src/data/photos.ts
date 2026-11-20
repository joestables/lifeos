import { useQuery } from '@tanstack/react-query'
import { clear, createStore, del, set, values } from 'idb-keyval'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { smallCopy } from '@/lib/photo-resize'
import type { Database } from './database.types'
import { newId } from './ids'
import type { WriteQueue } from './queue/queue'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

/** An Item's photo (core.attachments; ADR-0052). */
export type Photo = Pick<
  Database['core']['Tables']['attachments']['Row'],
  'id' | 'item_id' | 'path' | 'width' | 'height'
>

export const photosKey = ['core', 'attachments'] as const
const BUCKET = 'photos'
/** How long a link to a photo lasts: long, so the device keeps the same one, and its picture, offline. */
const LINK_SECONDS = 7 * 24 * 3600
/** A photo's file never changes (a new photo is a new file): kept a year. */
const KEEP = { contentType: 'image/webp', cacheControl: '31536000' }

export async function fetchPhotos(): Promise<Photo[]> {
  return allRows((from, to) =>
    supabase()
      .from('attachments')
      .select('id, item_id, path, width, height')
      .eq('kind', 'photo')
      .order('id')
      .range(from, to),
  )
}

const pathOf = (item: string, id: string) => `${item}/${id}.webp`

/** Where a photo's small copy is kept: beside it (ADR-0052). */
export const smallPath = (path: string) => path.replace(/\.webp$/, '.small.webp')

/** Photos with unsent changes laid over (OFF-001). */
export function applyPendingPhotos(
  rows: readonly Photo[],
  entries: readonly QueueEntry[],
): Photo[] {
  let out = [...rows]
  for (const e of entries) {
    const a = e.args as Record<string, unknown>
    if (e.fn === 'set_photo') {
      const item = String(a.p_item)
      const id = String(a.p_id)
      if (out.some((p) => p.id === id)) continue
      out = [
        ...out.filter((p) => p.item_id !== item),
        {
          id,
          item_id: item,
          path: pathOf(item, id),
          width: (a.p_width as number) ?? null,
          height: (a.p_height as number) ?? null,
        },
      ]
    } else if (e.fn === 'remove_photo') {
      out = out.filter((p) => p.item_id !== a.p_item)
    }
  }
  return out
}

/** Pictures chosen on this device, shown at once while their links come. */
const local = new Map<string, string>()

/** Resolves once nothing for the Item waits in the queue: Storage then knows it's mine. */
function whenSent(queue: WriteQueue, item: string): Promise<void> {
  const waiting = () =>
    queue.entries().some((e) => e.itemIds.includes(item) && e.state === 'pending')
  if (!waiting()) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = queue.subscribe(() => {
      if (waiting()) return
      stop()
      resolve()
    })
  })
}

// ---------------------------------------------------------------------------
// A photo held on the device until it can be sent (ADR-0066 13; WRD-005 6):
// a garment added without signal keeps its photo, in IndexedDB beside the
// write queue, uploaded once the garment has reached the server.

interface Held {
  item: string
  id: string
  path: string
  blob: Blob
  width: number
  height: number
  /** The photo it replaces, whose files go once it is sent. */
  old?: string
}

let heldStore: ReturnType<typeof createStore> | undefined
const heldDb = () => (heldStore ??= createStore('lifeos-held-photos', 'photos'))
let heldNow: readonly Held[] = []
const heldListeners = new Set<() => void>()
const setHeld = (next: readonly Held[]) => {
  heldNow = next
  for (const l of heldListeners) l()
}

/** Photos held on this device, as Photos, until they're sent. */
export function useHeldPhotos(): readonly Photo[] {
  const held = useSyncExternalStore(
    (l) => {
      heldListeners.add(l)
      return () => heldListeners.delete(l)
    },
    () => heldNow,
    () => heldNow,
  )
  const [photos, setPhotos] = useState<{ from: readonly Held[]; out: Photo[] }>({
    from: [],
    out: [],
  })
  if (photos.from !== held)
    setPhotos({
      from: held,
      out: held.map((h) => ({
        id: h.id,
        item_id: h.item,
        path: h.path,
        width: h.width,
        height: h.height,
      })),
    })
  return photos.out
}

/** Forgets the photos held on this device: signing out, or someone else signing in (ACC-003). */
export async function forgetHeldPhotos(): Promise<void> {
  setHeld([])
  try {
    await clear(heldDb())
  } catch {
    // Nothing kept.
  }
}

let sending = false
let again = false

/** Sends each held photo whose Item has reached the server; the rest wait. */
async function sendHeld(queue: WriteQueue): Promise<void> {
  if (sending) return void (again = true)
  sending = true
  try {
    for (const h of heldNow) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break
      const mine = queue.entries().filter((e) => e.itemIds.includes(h.item))
      // Its garment refused (OFF-004): the photo has nothing to belong to.
      if (mine.some((e) => e.state === 'failed' && /create_/.test(e.fn))) {
        void del(h.id, heldDb()).catch(() => undefined)
        setHeld(heldNow.filter((x) => x.id !== h.id))
        continue
      }
      if (mine.length) continue
      const bucket = supabase().storage.from(BUCKET)
      const [{ error }] = await Promise.all([
        bucket.upload(h.path, await h.blob.arrayBuffer(), KEEP),
        smallCopy(h.blob)
          .then(async (small) => bucket.upload(smallPath(h.path), await small.arrayBuffer(), KEEP))
          .catch(() => undefined),
      ])
      // Sent before and kept since: the file is there.
      if (error && !/exists|duplicate/i.test(error.message)) continue
      queue.enqueue(
        'set_photo',
        { p_id: h.id, p_item: h.item, p_width: h.width, p_height: h.height, p_bytes: h.blob.size },
        [h.item],
      )
      if (h.old) void bucket.remove([h.old, smallPath(h.old)])
      await del(h.id, heldDb()).catch(() => undefined)
      setHeld(heldNow.filter((x) => x.id !== h.id))
    }
  } catch {
    // No signal, or Storage refused: tried again later.
  } finally {
    sending = false
    if (again) {
      again = false
      void sendHeld(queue)
    }
  }
}

/**
 * Loads the photos held on this device, shows them, and sends each once
 * there is signal and its Item has reached the server: now, when the
 * device comes online, and whenever the queue changes.
 */
let started = false

export async function startHeldPhotos(queue: WriteQueue): Promise<void> {
  if (started) return
  started = true
  try {
    const kept = (await values<Held>(heldDb())).sort((a, b) => a.id.localeCompare(b.id))
    for (const h of kept) {
      const shown = URL.createObjectURL(h.blob)
      local.set(h.path, shown)
      local.set(smallPath(h.path), shown)
    }
    setHeld([...kept, ...heldNow.filter((h) => !kept.some((k) => k.id === h.id))])
  } catch {
    // This browser keeps nothing: photos held now are sent while the page is open.
  }
  window.addEventListener('online', () => void sendHeld(queue))
  queue.subscribe(() => void sendHeld(queue))
  void sendHeld(queue)
}

export function photoWrites(queue: WriteQueue) {
  return {
    /**
     * A garment's photo (ADR-0066 13): shown at once, held on this device,
     * and sent with its small copy once there is signal and the garment
     * has reached the server, then the old one's files removed.
     */
    holdPhoto(
      item: string,
      photo: {
        /** The photo, or the photo still being made (the sheet saved before it was ready). */
        blob: Blob | Promise<Blob>
        width: number
        height: number
        /** Shown until it is ready: the preview the sheet showed. */
        url?: string
      },
      old?: Photo,
    ): void {
      const id = newId()
      const path = pathOf(item, id)
      const hold = (blob: Blob) => {
        const shown = URL.createObjectURL(blob)
        local.set(path, shown)
        local.set(smallPath(path), shown)
        const h: Held = {
          item,
          id,
          path,
          blob,
          width: photo.width,
          height: photo.height,
          ...(old && { old: old.path }),
        }
        for (const x of heldNow)
          if (x.item === item) void del(x.id, heldDb()).catch(() => undefined)
        setHeld([...heldNow.filter((x) => x.item !== item), h])
        void set(id, h, heldDb())
          .catch(() => undefined)
          .then(() => sendHeld(queue))
      }
      if (photo.blob instanceof Blob) return hold(photo.blob)
      if (photo.url) {
        local.set(path, photo.url)
        local.set(smallPath(path), photo.url)
      }
      void photo.blob.then(hold, () => undefined)
    },
    /**
     * An Item's photo, made small on the device first (RCP-006 3): uploaded
     * once the Item has reached the server, with its small copy for cards,
     * then kept, the old one's files removed. Needs a connection; the
     * picture shows here at once.
     */
    async setPhoto(
      item: string,
      photo: { blob: Blob; width: number; height: number },
      old?: Photo,
    ): Promise<void> {
      const id = newId()
      const path = pathOf(item, id)
      const shown = URL.createObjectURL(photo.blob)
      local.set(path, shown)
      local.set(smallPath(path), shown)
      await whenSent(queue, item)
      const bucket = supabase().storage.from(BUCKET)
      const [{ error }] = await Promise.all([
        bucket.upload(path, await photo.blob.arrayBuffer(), KEEP),
        // Without its small copy a photo still shows, whole; it is made later.
        smallCopy(photo.blob)
          .then(async (small) => bucket.upload(smallPath(path), await small.arrayBuffer(), KEEP))
          .catch(() => undefined),
      ])
      if (error) {
        local.delete(path)
        local.delete(smallPath(path))
        throw error
      }
      queue.enqueue(
        'set_photo',
        {
          p_id: id,
          p_item: item,
          p_width: photo.width,
          p_height: photo.height,
          p_bytes: photo.blob.size,
        },
        [item],
      )
      if (old) void bucket.remove([old.path, smallPath(old.path)])
    },
    /** An Item without its photo; the files go too when there is signal. */
    removePhoto(item: string, old: Photo): void {
      queue.enqueue('remove_photo', { p_item: item }, [item])
      void supabase()
        .storage.from(BUCKET)
        .remove([old.path, smallPath(old.path)])
    },
  }
}

const DAY = 24 * 3600 * 1000
/** Each file's link, kept apart, until a day before it runs out. */
const signed = new Map<string, { url: string; until: number }>()
/** Files Storage says it hasn't: a small copy not made yet. */
const absent = new Set<string>()
const linkOf = (path: string) => signed.get(path)?.url ?? local.get(path)

/** Links as Storage gave them: null for a file it hasn't. */
type Links = Record<string, string | null>

const keepLinks = (links: Links, at: number) => {
  const now = Date.now()
  for (const [path, url] of Object.entries(links)) {
    if (url === null) {
      if (!linkOf(path)) absent.add(path)
      continue
    }
    absent.delete(path)
    // The first link is kept while it lasts, so the picture kept under it is used.
    if ((signed.get(path)?.until ?? 0) <= now)
      signed.set(path, { url, until: at + LINK_SECONDS * 1000 - DAY })
  }
}

/**
 * Asks Storage for the links these files lack: only those, so a new photo
 * on the page (a Meal planned) never reloads the others, and the same ones
 * while the page shows the same photos, so a later answer is heard.
 */
function useLinks(paths: readonly string[]): void {
  const all = paths.join('\n')
  const lacking = () => ({
    all,
    paths: paths.filter((p) => (signed.get(p)?.until ?? 0) <= Date.now() && !absent.has(p)),
  })
  const [asked, setAsked] = useState(lacking)
  if (asked.all !== all) setAsked(lacking())
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['storage', BUCKET, ...asked.paths],
    queryFn: async (): Promise<Links> => {
      const { data, error } = await supabase()
        .storage.from(BUCKET)
        .createSignedUrls(asked.paths, LINK_SECONDS)
      if (error) throw error
      return Object.fromEntries(
        data
          .filter((d) => d.path)
          .map((d) => [d.path!, d.error || !d.signedUrl ? null : d.signedUrl]),
      )
    },
    enabled: asked.paths.length > 0,
    // A small copy not made yet is asked after again within the hour.
    staleTime: (query) =>
      Object.values(query.state.data ?? {}).includes(null) ? DAY / 24 : LINK_SECONDS * 1000 - DAY,
  })
  // Fetched now, or kept in the cache from before (offline).
  if (data) keepLinks(data, dataUpdatedAt)
}

/**
 * Links to show photos by, from Storage (private), each lasting a week and
 * kept with the rest of the cache, so a photo seen before shows offline
 * (RCP-016 1). A photo chosen here shows from the device until then.
 * `small` gives each photo's small copy, for a card (ADR-0052); a photo
 * without one yet shows whole.
 */
export function usePhotoUrls(
  paths: readonly (string | undefined)[],
  size: 'whole' | 'small' = 'whole',
): ReadonlyMap<string, string> {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort()
  const small = size === 'small'
  useLinks(small ? wanted.map(smallPath) : wanted)
  useLinks(small ? wanted.filter((p) => absent.has(smallPath(p))) : [])
  const out = new Map<string, string>()
  for (const p of wanted) {
    const url = small
      ? (linkOf(smallPath(p)) ?? (absent.has(smallPath(p)) ? linkOf(p) : undefined))
      : linkOf(p)
    if (url) out.set(p, url)
  }
  return out
}

/** Photos this device has tried to make a small copy of, once each. */
const tried = new Set<string>()

async function makeSmallCopies(paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    const url = linkOf(path)
    if (!url || tried.has(path)) continue
    tried.add(path)
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const small = await smallCopy(await res.blob())
      const { error } = await supabase()
        .storage.from(BUCKET)
        .upload(smallPath(path), await small.arrayBuffer(), KEEP)
      if (error) continue
      local.set(smallPath(path), URL.createObjectURL(small))
      absent.delete(smallPath(path))
    } catch {
      // No signal, or a picture this browser can't read: it shows whole.
    }
  }
}

/**
 * Gives my photos kept before small copies were made (ADR-0052) theirs:
 * each made on this device, once the page has shown it whole, and kept
 * beside it. Only its Item's writer may, so only mine are passed.
 */
export function useSmallCopies(mine: readonly (string | undefined)[]): void {
  const todo = mine.filter(
    (p): p is string => !!p && absent.has(smallPath(p)) && !tried.has(p) && !!linkOf(p),
  )
  const all = todo.join('\n')
  useEffect(() => {
    if (all && navigator.onLine) void makeSmallCopies(all.split('\n'))
  }, [all])
}
