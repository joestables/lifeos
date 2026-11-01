import {
  CalendarIcon,
  ChefHatIcon,
  ClipboardListIcon,
  DumbbellIcon,
  FileTextIcon,
  LightbulbIcon,
  ShoppingCartIcon,
  SquareCheckBigIcon,
  UtensilsIcon,
  WeightIcon,
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
  recipe: ChefHatIcon,
  variation: ChefHatIcon,
  meal: UtensilsIcon,
  shopping_list: ShoppingCartIcon,
  exercise: WeightIcon,
  workout_template: ClipboardListIcon,
  workout: DumbbellIcon,
}
