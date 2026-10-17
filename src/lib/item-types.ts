import { plainLine } from './markdown-preview'
import { convertsTo, typeByKey, type Colour, type Mark } from '@lifeos/ontology'
import type { LucideIcon } from 'lucide-react'
import { FileIcon } from 'lucide-react'
import { TYPE_ICONS } from '@/components/lifeos/colours'

/** The roadmap stage being built: the app offers a Type from its stage on. */
export const APP_STAGE = 3

export interface TypeLook {
  key: string
  label: string
  colour: Colour
  icon: LucideIcon
  mark?: Mark
  /** The page an Item of this Type lives on, and that page's name. */
  home: '/inbox' | '/tasks' | '/notes' | '/plan'
  homeLabel: string
}

const HOMES: Record<string, Pick<TypeLook, 'home' | 'homeLabel'>> = {
  task: { home: '/tasks', homeLabel: 'Tasks' },
  note: { home: '/notes', homeLabel: 'Notes' },
  event: { home: '/plan', homeLabel: 'Plan' },
}

/** How a Type looks and where it lives (ontology + patterns.md#icons). */
export function typeLook(key: string): TypeLook {
  const t = typeByKey(key)
  return {
    key,
    label: t?.label ?? key,
    colour: t?.colour ?? 'yellow',
    icon: TYPE_ICONS[key] ?? FileIcon,
    mark: t?.mark,
    ...(HOMES[key] ?? { home: '/inbox', homeLabel: 'Inbox' }),
  }
}

/** The Types an Item can be converted into, among those the app has yet (ITM-004). */
export function convertTargets(type: string): TypeLook[] {
  const t = typeByKey(type)
  if (!t) return []
  return convertsTo(t)
    .filter((key) => (typeByKey(key)?.stage ?? Infinity) <= APP_STAGE)
    .map(typeLook)
}

/**
 * Whether an Item opens on a page of its own rather than in a popup
 * (patterns.md#opening-an-item): a Note on a phone.
 */
export function opensAsPage(type: string, isMobile: boolean): boolean {
  return type === 'note' && isMobile
}

/** An Item's name: its title, else its first line (NTE-001), else "Untitled". */
export function itemTitle(item: { title: string; body: string | null }): string {
  const first = item.body?.split('\n').find((line) => line.trim() !== '')
  return item.title.trim() || (first && plainLine(first).trim()) || 'Untitled'
}

/** The mark's name, as its Toggle is called. */
export const MARK_LABEL: Record<Mark, string> = {
  pinned: 'Pin',
  starred: 'Star',
  favourited: 'Favourite',
}
