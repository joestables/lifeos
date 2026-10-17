import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CalendarLink } from '@/data'
import { cn } from '@/lib/utils'

/**
 * A Google calendar to send Events to (GCL-002 2, GCL-005 1): "None" (they
 * stay in LifeOS), then my two-way calendars. My default calendar in
 * Settings, and a new Event's Calendar.
 */
export function CalendarSelect({
  links,
  value,
  onChange,
  id,
  size = 'default',
  className,
  'aria-label': ariaLabel,
}: {
  links: CalendarLink[]
  /** A calendar link's id, or null for none. */
  value: string | null
  onChange: (link: string | null) => void
  id?: string
  size?: 'default' | 'sm'
  className?: string
  'aria-label'?: string
}) {
  const items = [
    { value: '', label: 'None' },
    ...links.filter((l) => l.level === 'two_way').map((l) => ({ value: l.id, label: l.name })),
  ]
  return (
    <Select
      value={value ?? ''}
      items={items}
      onValueChange={(v) => onChange((v as string | null) || null)}
    >
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} className={cn(className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((l) => (
          <SelectItem key={l.value || 'none'} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
