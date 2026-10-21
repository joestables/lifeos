import { useState } from 'react'
import type { CardSize } from '@/components/lifeos'
import { DEFAULT_VIEW, type IdeaSort, type LibraryView } from '@/lib/recipes'

const KEY = 'lifeos.recipes.library'

type Kept = Omit<LibraryView, 'search'> & { size: CardSize; ideaSort: IdeaSort }

const DEFAULT: Kept = { ...DEFAULT_VIEW, size: 'M', ideaSort: 'added' }

function read(): Kept {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Kept>
    return { ...DEFAULT, ...kept, chosen: { ...kept.chosen } }
  } catch {
    return DEFAULT
  }
}

/**
 * The library's state, filters, sort, group and card size, and Ideas' sort,
 * kept for next time on this device (RCP-001 4, 6, 7; RCP-002 2); the
 * search is for this visit.
 */
export function useLibraryView() {
  const [kept, setKept] = useState(read)
  const [search, setSearch] = useState('')
  const change = (patch: Partial<Kept>) =>
    setKept((k) => {
      const next = { ...k, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Kept for this visit only.
      }
      return next
    })
  const view: LibraryView = { ...kept, search }
  return { view, size: kept.size, ideaSort: kept.ideaSort, change, setSearch }
}
