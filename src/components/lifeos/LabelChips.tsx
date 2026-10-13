import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import { CheckIcon, TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Labels as pills to choose (components.md): any number at once. Off is
 * outlined with a tag; on is the selected tint (the page's Type colour
 * inside TypeScope) with a tick. Too many for the width: they scroll
 * sideways, with no scrollbar.
 */
export function LabelChips({
  labels,
  chosen,
  onChange,
  'aria-label': ariaLabel = 'Filter by label',
  className,
}: {
  /** Mine, A to Z. */
  labels: readonly { id: string; name: string }[]
  chosen: ReadonlySet<string>
  onChange: (chosen: string[]) => void
  'aria-label'?: string
  className?: string
}) {
  return (
    <ToggleGroupPrimitive
      multiple
      aria-label={ariaLabel}
      value={labels.filter((l) => chosen.has(l.id)).map((l) => l.id)}
      onValueChange={(value: string[]) => onChange(value)}
      data-slot="label-chips"
      className={cn(
        'flex max-w-full min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]',
        className,
      )}
    >
      {labels.map((l) => {
        const on = chosen.has(l.id)
        return (
          <TogglePrimitive
            key={l.id}
            value={l.id}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors outline-none not-data-pressed:hover:bg-accent not-data-pressed:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft data-pressed:bg-selected data-pressed:text-selected-foreground data-pressed:shadow-none [&_svg]:size-3.5"
          >
            {on ? <CheckIcon aria-hidden className="stroke-3" /> : <TagIcon aria-hidden />}
            {l.name}
          </TogglePrimitive>
        )
      })}
    </ToggleGroupPrimitive>
  )
}
