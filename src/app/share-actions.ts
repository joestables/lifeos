import { useEffect } from 'react'
import {
  createRecipe,
  linkPreview,
  queue,
  updateItem,
  updateVariation,
  useFood,
  useOnline,
  type FoodData,
} from '@/data'
import { resizePhoto } from '@/lib/photo-resize'
import { nameTaken } from '@/lib/recipes'
import { freeName, sharedLink, sharedName, siteOf, type Shared } from '@/lib/share'
import { keepPhoto } from './keep-photo'

/** Ideas kept from a share whose name and thumbnail are still to fill in (RCP-003 3). */
const FILLING = 'lifeos.share.filling'
/** A share that arrived signed out, kept to carry on after signing in. */
const WAITING = 'lifeos.share.waiting'

interface Filling {
  recipe: string
  link: string
  /** The name it was kept with: replaced by the link's own only while it still has it. */
  name: string
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Kept for this visit only.
  }
}

/** A share kept until signed in (ADR-0055: signed out, it signs in and carries on). */
export const keepWaiting = (shared: Shared) => write(WAITING, shared)
export function takeWaiting(): Shared | null {
  const shared = read<Shared | null>(WAITING, null)
  write(WAITING, null)
  return shared
}

/**
 * Keeps a shared link as an Idea at once (RCP-003 1), offline too, through
 * the write queue: named from what was shared, else its site, a name no
 * Recipe of mine has; the link its source. Its own name and thumbnail are
 * filled in when there's signal.
 */
export function keepShared(
  food: FoodData,
  shared: Shared,
): { recipe: string; name: string } | null {
  const link = sharedLink(shared)
  if (!link) return null
  const taken = (n: string) => !!nameTaken(food.recipes, n)
  const name = freeName(sharedName(shared, link) ?? `Idea from ${siteOf(link)}`, taken)
  const { recipe, variation } = createRecipe(name, 'idea')
  updateVariation(variation, { sources: [link] })
  write(FILLING, [...read<Filling[]>(FILLING, []), { recipe, link, name }])
  void fillShared(food)
  return { recipe, name }
}

let filling = false

/**
 * Fills in the Ideas kept from shares (RCP-003 1, 3): the link's own name,
 * while the Idea still has the one it was kept with and no Recipe of mine
 * has it, and its thumbnail, while it has no photo. Quietly nothing when the
 * link offers neither; tried again when the signal returns.
 */
export async function fillShared(food: FoodData) {
  if (filling || !navigator.onLine) return
  filling = true
  try {
    for (const f of read<Filling[]>(FILLING, [])) {
      const found = await linkPreview(f.link)
      // Unreachable: tried again when the signal returns.
      if (!found) return
      const { name, photo } = found
      const idea = food.byId.get(f.recipe)
      const current = idea?.item.title ?? f.name
      if (name && current === f.name && name !== f.name && !nameTaken(food.recipes, name))
        updateItem(f.recipe, { title: name })
      if (photo && !idea?.photo) {
        try {
          const made = await resizePhoto(await (await fetch(photo)).blob())
          keepPhoto(f.recipe, { ...made, url: '' }, undefined)
        } catch {
          // A picture the browser can't read: the Idea goes without.
        }
      }
      write(
        FILLING,
        read<Filling[]>(FILLING, []).filter((x) => x.recipe !== f.recipe),
      )
    }
  } finally {
    filling = false
  }
}

/** Fills in shared Ideas whenever the app is open with signal (RCP-003 3). */
export function useFillShared() {
  const food = useFood(queue)
  const online = useOnline()
  const ready = !food.isLoading
  // Nothing to fill is the usual case, and costs one read of local storage.
  useEffect(() => {
    if (online && ready) void fillShared(food)
  }, [online, ready, food])
}
