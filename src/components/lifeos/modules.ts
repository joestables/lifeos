import {
  CalendarIcon,
  FileTextIcon,
  LightbulbIcon,
  SquareCheckBigIcon,
  type LucideIcon,
} from 'lucide-react'

/**
 * The Modules that have a colour (tokens.md#colour-modules). The core has
 * none: its Types are grey.
 */
export const MODULES = ['core', 'lists', 'food', 'fitness', 'goals', 'wardrobe', 'finance'] as const
export type ModuleKey = (typeof MODULES)[number]

/** Each Type always uses the same icon (patterns.md#icons). Later Types join with their stage. */
export const TYPE_ICONS: Record<string, LucideIcon> = {
  thought: LightbulbIcon,
  note: FileTextIcon,
  task: SquareCheckBigIcon,
  event: CalendarIcon,
}
