import {
  BellRingIcon,
  CalendarIcon,
  ChefHatIcon,
  ClipboardListIcon,
  DumbbellIcon,
  FileTextIcon,
  LightbulbIcon,
  ShoppingCartIcon,
  SquareCheckBigIcon,
  UtensilsIcon,
  type LucideIcon,
} from 'lucide-react'

/**
 * The Type colours (tokens.md#colour-types). Related Types share one; 'none'
 * is neutral (Inbox, Plan, and Finance until Stage 9).
 */
export const COLOURS = ['blue', 'yellow', 'coral', 'green', 'orange', 'purple', 'none'] as const
export type TypeColour = (typeof COLOURS)[number]

/** Each Type always uses the same icon (patterns.md#icons). Later Types join with their stage. */
export const TYPE_ICONS: Record<string, LucideIcon> = {
  thought: LightbulbIcon,
  note: FileTextIcon,
  task: SquareCheckBigIcon,
  event: CalendarIcon,
  reminder: BellRingIcon,
  recipe: ChefHatIcon,
  variation: ChefHatIcon,
  meal: UtensilsIcon,
  shopping_list: ShoppingCartIcon,
  exercise: DumbbellIcon,
  workout_template: ClipboardListIcon,
  workout: DumbbellIcon,
}
