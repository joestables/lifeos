import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FoodSpaces } from '@/data'

/** "All my meals", the week's Show filter's first choice (MPL-001 5). */
export const ALL = 'all'

/**
 * Personal or one of my Households, as a Select (HSH-003 2): where a
 * Meal is, where new ones go, or (with `all`) whose Meals the week shows.
 */
export function SpaceSelect({
  spaces,
  value,
  onChange,
  label,
  all = false,
  size = 'sm',
  className = 'w-40',
}: {
  spaces: FoodSpaces['spaces']
  value: string
  onChange: (space: string) => void
  label: string
  /** Adds "All my meals" first. */
  all?: boolean
  /** `default` among a popup's fields; `sm` in a toolbar or a Card's row. */
  size?: 'sm' | 'default'
  className?: string
}) {
  const items = [
    ...(all ? [{ value: ALL, label: 'All my meals' }] : []),
    ...spaces.map((s) => ({ value: s.id, label: s.name })),
  ]
  return (
    <Select value={value} items={items} onValueChange={(v) => v && onChange(String(v))}>
      <SelectTrigger size={size} className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
