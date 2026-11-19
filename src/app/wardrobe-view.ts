import { useState } from 'react'
import type { CardSize } from '@/components/lifeos'
import { DEFAULT_WARDROBE_VIEW, GARMENT_SORTS, type WardrobeView } from '@/lib/wardrobe'

const KEY = 'lifeos.wardrobe.view'

type Kept = Omit<WardrobeView, 'search'> & { size: CardSize }

const DEFAULT: Kept = { ...DEFAULT_WARDROBE_VIEW, size: 'M' }

function read(): Kept {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Kept>
    const out = { ...DEFAULT, ...kept, chosen: { ...kept.chosen } }
    if (!GARMENT_SORTS.some((s) => s.value === out.sort)) {
      out.sort = DEFAULT.sort
      out.sortDir = DEFAULT.sortDir
    }
    return out
  } catch {
    return DEFAULT
  }
}

/**
 * The Wardrobe tab's filters, sort, group and card size, kept for next
 * time on this device (WRD-001 2, WRD-002 1, WRD-003); the search is for
 * this visit.
 */
export function useWardrobeView() {
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
  const view: WardrobeView = { ...kept, search }
  return { view, size: kept.size, change, setSearch }
}
