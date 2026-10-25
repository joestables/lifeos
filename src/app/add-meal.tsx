import { ArrowLeftIcon, ChefHatIcon, PlusIcon, RotateCcwIcon, UtensilsIcon } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LabelChips, PickRow, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RecipeView } from '@/data/food-hooks'
import {
  SLOTS,
  SLOT_LABEL,
  leftoverChoices,
  plannedLately,
  slotName,
  type SlotKey,
} from '@/lib/meals'
import { valueChoices } from '@/lib/recipes'
import {
  planLeftovers,
  planRecipe,
  planTyped,
  useMealPlan,
  type MealPlanData,
} from './meal-actions'
import { SearchField } from './search-field'

type Mode =
  | { kind: 'recipes' }
  | { kind: 'variations'; recipe: RecipeView }
  | { kind: 'typed' }
  | { kind: 'leftovers' }

const live = (r: RecipeView) => r.variations.filter((v) => v.item.status !== 'cancelled')

/**
 * What a slot's "+" offers (MPL-002, patterns.md#meal-plan): my Recipes,
 * planned lately first, narrowed by a search and my categories (the slot's
 * to start); a Recipe's Variations when it has more than one; or a Meal
 * typed, or leftovers of an earlier one. `onDone` once a Meal is planned.
 */
export function MealPicker({
  plan,
  day,
  slot,
  onDone,
}: {
  plan: MealPlanData
  day: string
  slot: SlotKey
  onDone: () => void
}) {
  const { food } = plan
  const categories = valueChoices(food.values, food.recipes, 'category')
  const start = categories.find((c) => c.toLowerCase() === slot)
  const [mode, setMode] = useState<Mode>({ kind: 'recipes' })
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set(start ? [start] : []))
  const [typed, setTyped] = useState('')

  const choose = (r: RecipeView) => {
    const vs = live(r)
    if (vs.length > 1) return setMode({ kind: 'variations', recipe: r })
    const v = r.defaultVariation ?? vs[0]
    if (!v) return
    planRecipe(day, slot, r, v, plan.spaces.home)
    onDone()
  }

  if (mode.kind === 'variations') {
    const r = mode.recipe
    const vs = live(r).sort((a, b) =>
      a.item.id === r.defaultVariation?.item.id
        ? -1
        : b.item.id === r.defaultVariation?.item.id
          ? 1
          : 0,
    )
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={() => setMode({ kind: 'recipes' })}
          >
            <ArrowLeftIcon />
          </Button>
          <span className="truncate text-sm font-semibold">{r.item.title}</span>
        </div>
        <div className="flex flex-col">
          {vs.map((v) => (
            <PickRow
              key={v.item.id}
              leading={<TypeTile colour="green" icon={ChefHatIcon} size="sm" />}
              title={v.item.title}
              meta={v.item.id === r.defaultVariation?.item.id ? 'Default' : undefined}
              onClick={() => {
                planRecipe(day, slot, r, v, plan.spaces.home)
                onDone()
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (mode.kind === 'typed') {
    const add = () => {
      if (!typed.trim()) return
      planTyped(day, slot, typed, plan.spaces.home)
      onDone()
    }
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input
          size="sm"
          autoFocus
          aria-label="Meal"
          placeholder="Out: Dishoom"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={!typed.trim()}>
          Add
        </Button>
      </form>
    )
  }

  if (mode.kind === 'leftovers') {
    const choices = leftoverChoices(plan.meals, day, slot)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={() => setMode({ kind: 'recipes' })}
          >
            <ArrowLeftIcon />
          </Button>
          <span className="text-sm font-semibold">Leftovers of</span>
        </div>
        {choices.length ? (
          <div className="flex flex-col">
            {choices.map((m) => (
              <PickRow
                key={m.id}
                leading={<TypeTile colour="green" icon={RotateCcwIcon} size="sm" />}
                title={plan.name(m)}
                meta={slotName(m.day!, m.slot!)}
                onClick={() => {
                  planLeftovers(day, slot, m, plan.name(m))
                  onDone()
                }}
              />
            ))}
          </div>
        ) : (
          <p className="px-1.5 text-sm text-muted-foreground">No meals in the week before</p>
        )}
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const shown = food.recipes
    .filter((r) => r.state === 'active' || r.state === 'done')
    .filter((r) => !q || r.item.title.toLowerCase().includes(q))
    .filter((r) => !chosen.size || (r.heading.category !== null && chosen.has(r.heading.category)))
  const lately = plannedLately(plan.meals, food.recipeOf)
    .map((id) => shown.find((r) => r.item.id === id))
    .filter((r): r is RecipeView => r !== undefined)
  const rest = shown
    .filter((r) => !lately.includes(r))
    .sort((a, b) => a.item.title.localeCompare(b.item.title))
  const row = (r: RecipeView) => (
    <PickRow
      key={r.item.id}
      leading={<TypeTile colour="green" icon={ChefHatIcon} size="sm" />}
      title={r.item.title}
      meta={
        [r.heading.cuisine, r.mine ? null : plan.spaces.firstName(r.item.owner_id)]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      onClick={() => choose(r)}
    />
  )
  return (
    <div className="flex flex-col gap-2.5">
      <SearchField label="Search recipes" value={search} onChange={setSearch} />
      {categories.length > 0 && (
        <LabelChips
          aria-label="Category"
          icon={PlusIcon}
          labels={categories.map((c) => ({ id: c, name: c }))}
          chosen={chosen}
          onChange={(next) => setChosen(new Set(next))}
        />
      )}
      {lately.length > 0 && (
        <>
          <div className="px-1 text-xs font-semibold text-muted-foreground">Planned lately</div>
          <div className="flex flex-col">{lately.map(row)}</div>
        </>
      )}
      {rest.length > 0 && (
        <>
          <div className="px-1 text-xs font-semibold text-muted-foreground">All recipes</div>
          <div className="flex max-h-60 flex-col overflow-y-auto">{rest.map(row)}</div>
        </>
      )}
      {!shown.length && <p className="px-1.5 text-sm text-muted-foreground">No recipes match</p>}
      <div className="flex gap-1 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setMode({ kind: 'typed' })}
        >
          <UtensilsIcon /> Type a meal
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setMode({ kind: 'leftovers' })}
        >
          <RotateCcwIcon /> Leftovers
        </Button>
      </div>
    </div>
  )
}

const dayTitle = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/**
 * Plan's "+" → Meal (PLN-008 4): the day's slot, Dinner to start, then the
 * Meal plan's search in its place.
 */
export function AddMealDialog({ day, onClose }: { day: string; onClose: () => void }) {
  const plan = useMealPlan()
  const [slot, setSlot] = useState<SlotKey>('dinner')
  const date = new Date(`${day}T12:00:00`)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>Add a meal · {dayTitle.format(date).replace(',', '')}</DialogTitle>
        </DialogHeader>
        <ToggleGroup
          aria-label="Slot"
          value={[slot]}
          onValueChange={(v: string[]) => v[0] && setSlot(v[0] as SlotKey)}
          className="self-start"
        >
          {SLOTS.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {SLOT_LABEL[s]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <MealPicker key={slot} plan={plan} day={day} slot={slot} onDone={onClose} />
      </DialogContent>
    </Dialog>
  )
}
