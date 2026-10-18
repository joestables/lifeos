import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LabelChips } from './LabelChips'

export interface FilterGroup {
  name: string
  values: string[]
  chosen?: string[]
}

/**
 * The library's filters, always showing in their own column on a computer
 * (Joe, 18 October): each group a label over its values as chips, any
 * number chosen; "Reset" while any is chosen. On a phone the same panel
 * opens from a Filters button.
 */
export function FilterPanel({
  groups,
  onChange,
  onReset,
  children,
}: {
  groups: FilterGroup[]
  onChange: (group: string, chosen: string[]) => void
  onReset: () => void
  /** Anything above the groups. */
  children?: ReactNode
}) {
  const any = groups.some((g) => g.chosen?.length)
  return (
    <aside aria-label="Filters" className="flex min-w-0 flex-col gap-5">
      <div className="flex h-8 items-center justify-between">
        <span className="text-sm font-bold">Filters</span>
        {any && (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 text-muted-foreground"
            onClick={onReset}
          >
            Reset
          </Button>
        )}
      </div>
      {children}
      {groups.map((g) => (
        <div key={g.name} className="flex flex-col gap-2">
          <Label className="text-muted-foreground">{g.name}</Label>
          <LabelChips
            aria-label={g.name}
            icon={null}
            className="flex-wrap overflow-visible"
            labels={g.values.map((v) => ({ id: v, name: v }))}
            chosen={new Set(g.chosen ?? [])}
            onChange={(chosen) => onChange(g.name, chosen)}
          />
        </div>
      ))}
    </aside>
  )
}
