import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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

export function photoWrites(queue: WriteQueue) {
  return {
    /**
     * An Item's photo, made small on the device first (RCP-006 3): uploaded
     * once the Item has reached the server, then kept, the old one's file
     * removed. Needs a connection; the picture shows here at once.
     */
    async setPhoto(
      item: string,
      photo: { blob: Blob; width: number; height: number },
      old?: Photo,
    ): Promise<void> {
      const id = newId()
      const path = pathOf(item, id)
      local.set(path, URL.createObjectURL(photo.blob))
      await whenSent(queue, item)
      const { error } = await supabase()
        .storage.from(BUCKET)
        .upload(path, await photo.blob.arrayBuffer(), { contentType: 'image/webp' })
      if (error) {
        local.delete(path)
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
      if (old) void supabase().storage.from(BUCKET).remove([old.path])
    },
    /** An Item without its photo; the file goes too when there is signal. */
    removePhoto(item: string, old: Photo): void {
      queue.enqueue('remove_photo', { p_item: item }, [item])
      void supabase().storage.from(BUCKET).remove([old.path])
    },
  }
}

/** Each photo's link, kept apart, until a day before it runs out. */
const signed = new Map<string, { url: string; until: number }>()
const keepSigned = (urls: Record<string, string>, at: number) => {
  for (const [path, url] of Object.entries(urls))
    if (!signed.has(path)) signed.set(path, { url, until: at + (LINK_SECONDS - 24 * 3600) * 1000 })
}

/**
 * Links to show photos by, from Storage (private), each lasting a week and
 * kept with the rest of the cache, so a photo seen before shows offline
 * (RCP-016 1). A photo chosen here shows from the device until then. Only
 * paths without a link are asked for, so a new photo on the page (a Meal
 * planned) never reloads the others.
 */
export function usePhotoUrls(paths: readonly (string | undefined)[]): ReadonlyMap<string, string> {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort()
  // When the page opened: a link runs out days later, long after.
  const [now] = useState(() => Date.now())
  const missing = wanted.filter((p) => (signed.get(p)?.until ?? 0) <= now)
  for (const p of missing) signed.delete(p)
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['storage', BUCKET, ...missing],
    queryFn: async () => {
      const { data, error } = await supabase()
        .storage.from(BUCKET)
        .createSignedUrls(missing, LINK_SECONDS)
      if (error) throw error
      return Object.fromEntries(
        data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]),
      ) as Record<string, string>
    },
    enabled: missing.length > 0,
    staleTime: (LINK_SECONDS - 24 * 3600) * 1000,
  })
  // Fetched now, or kept in the cache from before (offline).
  if (data) keepSigned(data, dataUpdatedAt)
  const out = new Map<string, string>()
  for (const p of wanted) {
    const url = signed.get(p)?.url ?? local.get(p)
    if (url) out.set(p, url)
  }
  return out
}
