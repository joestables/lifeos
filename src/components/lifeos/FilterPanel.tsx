import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { LabelChips } from './LabelChips'

export interface FilterGroup {
  name: string
  values: string[]
  chosen?: string[]
  /** Always open, every value showing (Category); the rest collapse. */
  open?: boolean
}

/**
 * The library's filters in one Card, always showing on a computer (Joe, 18
 * October): "Filters" and Reset (while anything is chosen), then whatever
 * comes first (the State toggle), then each group. Open groups show every
 * value as chips; the others are an Accordion, all collapsed at first,
 * each naming how many of its values are chosen. Any of a group, all
 * groups together. On a phone the same panel sits in a Sheet.
 */
export function FilterPanel({
  groups,
  onChange,
  onReset,
  children,
  bare = false,
}: {
  groups: FilterGroup[]
  /** In a Sheet (a phone): no Card and no heading; the Sheet has both, and Reset in its footer. */
  bare?: boolean
  onChange: (group: string, chosen: string[]) => void
  onReset: () => void
  /** Sections before the groups, each a FilterSection (State). */
  children?: ReactNode
}) {
  const any = groups.some((g) => g.chosen?.length)
  const chips = (g: FilterGroup) => (
    <LabelChips
      aria-label={g.name}
      icon={null}
      className="flex-wrap overflow-visible"
      labels={g.values.map((v) => ({ id: v, name: v }))}
      chosen={new Set(g.chosen ?? [])}
      onChange={(chosen) => onChange(g.name, chosen)}
    />
  )
  const collapsing = groups.filter((g) => !g.open)
  const sections = (
    <>
      <div className={cn('flex flex-col gap-4', !bare && 'p-4')}>
        {children}
        {groups
          .filter((g) => g.open)
          .map((g) => (
            <FilterSection key={g.name} title={g.name}>
              {chips(g)}
            </FilterSection>
          ))}
      </div>
      {collapsing.length > 0 && (
        <>
          <Separator className={bare ? 'my-4' : undefined} />
          <Accordion multiple className={cn('gap-0', !bare && 'px-4 py-2')}>
            {collapsing.map((g) => (
              <AccordionItem key={g.name} value={g.name}>
                <AccordionTrigger size="sm">
                  {g.name}
                  {!!g.chosen?.length && (
                    <Badge variant="secondary" aria-label={`${g.chosen.length} chosen`}>
                      {g.chosen.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3">{chips(g)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}
    </>
  )
  if (bare) return sections
  return (
    <Card role="region" aria-label="Filters" className="min-w-0 gap-0 p-0">
      <div className="flex h-12 items-center justify-between pr-2 pl-4">
        <span className="font-bold">Filters</span>
        {any && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        )}
      </div>
      <Separator />
      {sections}
    </Card>
  )
}

/** A section of the FilterPanel that is always open: its name, then its control. */
export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </section>
  )
}

/**
 * A page with its FilterPanel: a 248px column beside the content on a
 * computer; on a phone the panel is left to a Sheet and the content takes
 * the width.
 */
export function FilterLayout({ filters, children }: { filters: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <div className="hidden lg:block">{filters}</div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  )
}
