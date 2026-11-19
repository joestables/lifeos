import { useState } from 'react'

const KEY = 'lifeos.wardrobe.builder'

/** What's in the Outfit builder (WRD-014 3), kept on this device (WRD-014 6). */
export interface Builder {
  garments: string[]
  collections: string[]
  name: string
  /** Clear after saving, kept for next time. */
  clearAfter: boolean
}

const EMPTY: Builder = { garments: [], collections: [], name: '', clearAfter: true }

function read(): Builder {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Builder>) }
  } catch {
    return EMPTY
  }
}

/** The Outfit builder's garments, collections, name and switch, as they were left. */
export function useOutfitBuilder() {
  const [builder, setBuilder] = useState(read)
  const change = (patch: Partial<Builder> | ((b: Builder) => Partial<Builder>)) =>
    setBuilder((b) => {
      const next = { ...b, ...(typeof patch === 'function' ? patch(b) : patch) }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Kept for this visit only.
      }
      return next
    })
  const toggle = (id: string, on: boolean) =>
    change((b) => ({
      garments: on ? [...new Set([...b.garments, id])] : b.garments.filter((g) => g !== id),
    }))
  /** Emptied, the switch kept. */
  const clear = () => change({ garments: [], collections: [], name: '' })
  return { builder, change, toggle, clear }
}
