import { useState } from 'react'
import { addLabel, createLabel, newId, queue, useLabels } from '@/data'

/**
 * The Labels chosen for an Item not yet kept ("New task", "New event"):
 * mine and any named here, A to Z; a Label named here is made only on Save.
 */
export function useDraftLabels(initial: readonly string[] = []) {
  const { labels } = useLabels(queue)
  const [made, setMade] = useState<{ id: string; name: string }[]>([])
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(initial))
  const all = [...labels, ...made].sort((a, b) => a.name.localeCompare(b.name))

  const toggle = (id: string, on: boolean) =>
    setChosen((c) => {
      const next = new Set(c)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const create = (name: string) => {
    const existing = all.find(
      (l) => l.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
    )
    const id = existing?.id ?? newId()
    if (!existing) setMade((n) => [...n, { id, name: name.trim() }])
    setChosen((c) => new Set([...c, id]))
  }
  /** Gives the kept Item its Labels, making the new ones; returns their ids. */
  const save = (itemId: string): string[] => {
    const ids = [...chosen].map((l) => {
      const m = made.find((n) => n.id === l)
      return m ? createLabel(m.name) : l
    })
    for (const l of ids) addLabel(itemId, l)
    return ids
  }
  return { labels: all, chosen, toggle, create, save }
}
