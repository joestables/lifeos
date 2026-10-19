import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  queue,
  searchItemIds,
  searchKey,
  useFood,
  useItems,
  useLabels,
  useOnline,
  type Item,
} from '@/data'
import { isoDayOf } from '@/lib/dates'
import { matches } from '@/lib/recipes'
import { searchItems, searchWords } from '@/lib/search'
import { currentOccurrences } from '@/lib/series'

const SHOWN = 30

/** What was typed, once typing pauses. */
function useSettled(value: string, ms = 150): string {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

/**
 * A search's results (SRC-001): the server's, best match first, shown as the
 * device has them. Offline, or with the server out of reach, the Items on
 * the device are searched instead (SRC-002). A repeating Task shows once,
 * as its lists show it. Recipes and Ideas are found by name, tag or
 * ingredient on the device too (RCP-016 2); a Variation is found as its Recipe.
 */
export function useSearch(query: string): {
  results: Item[]
  words: string[]
  /** Searched on the device only: why. */
  onDevice?: 'offline' | 'unreachable'
  /** Results for what was typed have come. */
  done: boolean
} {
  const settled = useSettled(query.trim())
  const online = useOnline()
  const { items } = useItems(queue)
  const { labels, itemLabels } = useLabels(queue)
  const food = useFood(queue)
  const words = useMemo(() => searchWords(settled), [settled])
  const server = useQuery({
    queryKey: searchKey(settled),
    queryFn: () => searchItemIds(settled),
    enabled: online && words.length > 0,
    placeholderData: keepPreviousData,
    networkMode: 'online',
    gcTime: 60_000,
    retry: false,
  })

  return useMemo(() => {
    if (words.length === 0) return { results: [], words, done: true }
    const names = new Map(labels.map((l) => [l.id, l.name]))
    const labelsOf = new Map<string, string[]>()
    for (const r of itemLabels) {
      const name = names.get(r.label_id)
      if (name !== undefined) labelsOf.set(r.item_id, [...(labelsOf.get(r.item_id) ?? []), name])
    }
    const of = (id: string) => labelsOf.get(id) ?? []
    const shown = currentOccurrences(items, isoDayOf(new Date())).filter(
      // An archived Recipe is found, marked so (SRC-003 1).
      (i) => (i.status !== 'cancelled' || i.type === 'recipe') && i.type !== 'variation',
    )
    // Recipes by tag or ingredient, which the server's search doesn't hold.
    const withRecipes = (found: Item[]) => {
      const ids = new Set(found.map((i) => i.id))
      const recipes = food.recipes
        .filter((r) => !ids.has(r.item.id))
        .filter((r) => matches(r, settled, food.pantry))
        .map((r) => r.item)
      return [...found, ...recipes].slice(0, SHOWN)
    }

    if (!online || server.isError) {
      const results = withRecipes(searchItems(shown, of, settled, SHOWN))
      return { results, words, onDevice: online ? 'unreachable' : 'offline', done: true }
    }
    if (!server.data) return { results: [], words, done: false }
    // An Item with unsent changes is found as the device has it.
    const byId = new Map(shown.map((i) => [i.id, i]))
    const found = server.data.map((id) => byId.get(id)).filter((i) => i && !i.sync) as Item[]
    const unsent = searchItems(
      shown.filter((i) => i.sync),
      of,
      settled,
    )
    return {
      results: withRecipes([...found, ...unsent]),
      words,
      done: !server.isPlaceholderData,
    }
  }, [
    words,
    settled,
    labels,
    itemLabels,
    items,
    online,
    server.isError,
    server.data,
    server.isPlaceholderData,
    food.recipes,
    food.pantry,
  ])
}
