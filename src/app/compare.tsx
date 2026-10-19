import { GitCompareArrowsIcon } from 'lucide-react'
import { useState } from 'react'
import { RecipePanel } from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FoodData } from '@/data'
import type { RecipeView, VariationView } from '@/data/food-hooks'
import { cn } from '@/lib/utils'
import { byPosition, compareLines, plainText } from '@/lib/recipe-parts'

function Row({ amount, text, differs }: { amount?: string; text: string; differs: boolean }) {
  return (
    <div
      className={cn(
        '-mx-2 flex items-baseline gap-3 rounded-sm px-2 py-1.5',
        differs && 'bg-selected',
      )}
    >
      {amount !== undefined && (
        <span className="w-16 shrink-0 font-semibold tabular-nums">{amount}</span>
      )}
      <span className="min-w-0 flex-1">{text}</span>
      {differs && <Badge variant="outline">Differs</Badge>}
    </div>
  )
}

const stepsOf = (v: VariationView) =>
  [...v.steps]
    .sort(byPosition)
    .map((s) => plainText(s.text))
    .filter((t) => t.trim())

/**
 * Two Variations side by side (RCP-009 4): their ingredients and methods,
 * what differs filled `--selected` and marked.
 */
export function Compare({ recipe, food }: { recipe: RecipeView; food: FoodData }) {
  const live = recipe.variations.filter((v) => v.item.status !== 'cancelled')
  const [first, setFirst] = useState(live[0]?.item.id ?? '')
  const [second, setSecond] = useState(live[1]?.item.id ?? live[0]?.item.id ?? '')
  const a = live.find((v) => v.item.id === first)
  const b = live.find((v) => v.item.id === second)
  const options = live.map((v) => ({ value: v.item.id, label: v.item.title }))
  const choose = (label: string, value: string, onChange: (v: string) => void) => (
    <Select value={value} items={options} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger size="sm" aria-label={label} className="w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const lines = a && b ? compareLines(a.lines, b.lines, food.pantry) : []
  const sa = a ? stepsOf(a) : []
  const sb = b ? stepsOf(b) : []
  const column = (
    v: VariationView | undefined,
    side: 'first' | 'second',
    steps: string[],
    other: string[],
  ) =>
    v && (
      <div className="flex flex-col gap-4">
        <RecipePanel title={v.item.title}>
          <div className="flex flex-col">
            {lines.map((l) => (
              <Row key={l.name} amount={l[side] ?? '—'} text={l.name} differs={l.differs} />
            ))}
          </div>
        </RecipePanel>
        <RecipePanel title="Method">
          <div className="flex flex-col">
            {steps.map((t, i) => (
              <Row key={i} text={`${i + 1}. ${t}`} differs={t !== other[i]} />
            ))}
          </div>
        </RecipePanel>
      </div>
    )

  return (
    <div className="flex flex-col gap-4 px-5 pb-12 sm:px-9">
      <div className="flex items-center gap-2">
        {choose('First', first, setFirst)}
        <GitCompareArrowsIcon aria-hidden className="size-4 text-muted-foreground" />
        {choose('Second', second, setSecond)}
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        {column(a, 'first', sa, sb)}
        {column(b, 'second', sb, sa)}
      </div>
    </div>
  )
}
