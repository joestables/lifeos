import { useNavigate } from '@tanstack/react-router'
import { ChefHatIcon, RotateCcwIcon, UtensilsIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { ItemDialog, ItemRow, TypeTile } from '@/components/lifeos'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setMealVariation, updateMeal } from '@/data'
import { useOnLeave } from '@/hooks/use-on-leave'
import { nextMealSlot, slotName, type PlannedMeal, type SlotKey } from '@/lib/meals'
import {
  moveMeal,
  planLeftovers,
  removeMeal,
  setEaten,
  setMealSpace,
  useMealPlan,
  type MealPlanData,
} from './meal-actions'
import { SlotDialog } from './meal-dialogs'
import { SpaceSelect } from './space-select'
import { MealIngredients } from './meal-ingredients'
import { MoreMenu } from './more-menu'
import { Field } from './task-details'

/**
 * A Meal, opened over the page (MPL-003 1, patterns.md#meal-plan): eaten,
 * its Recipe and Variation, servings, what it is leftovers of and its own
 * leftovers; Move to…, Add leftovers… and Remove.
 */
export function MealPopup({ id, onClose }: { id: string; onClose: () => void }) {
  const plan = useMealPlan()
  const meal = plan.byId.get(id)
  const [asking, setAsking] = useState<'move' | 'leftovers' | null>(null)
  if (!meal) return null
  const name = plan.name(meal)
  const slot = (meal.slot ?? 'dinner') as SlotKey
  const day = meal.day ?? ''
  return (
    <>
      <ItemDialog
        open={asking === null}
        onOpenChange={(open) => !open && onClose()}
        colour="green"
        icon={UtensilsIcon}
        typeLabel={day ? `Meal · ${slotName(day, slot)}` : 'Meal'}
        title={name}
        leading={
          <Checkbox
            colour="green"
            aria-label="Eaten"
            className="size-5"
            checked={meal.status === 'done'}
            onCheckedChange={(on) => setEaten(meal, on)}
          />
        }
        actions={
          <MoreMenu>
            <DropdownMenuItem onClick={() => setAsking('move')}>Move to…</DropdownMenuItem>
            {!meal.leftoversOf && (
              <DropdownMenuItem onClick={() => setAsking('leftovers')}>
                Add leftovers…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                onClose()
                removeMeal(meal, name, plan.meals)
              }}
            >
              Remove
            </DropdownMenuItem>
          </MoreMenu>
        }
      >
        <MealDetails key={meal.id} plan={plan} meal={meal} />
      </ItemDialog>
      {asking === 'move' && (
        <SlotDialog
          title="Move to"
          action="Move"
          day={day}
          slot={slot}
          onChoose={(d, s) => moveMeal(meal, name, d, s)}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === 'leftovers' && (
        <SlotDialog
          title="Add leftovers"
          action="Add"
          {...nextMealSlot(day, slot)}
          onChoose={(d, s) => planLeftovers(d, s, meal, name)}
          onClose={() => setAsking(null)}
        />
      )}
    </>
  )
}

function MealDetails({ plan, meal }: { plan: MealPlanData; meal: PlannedMeal }) {
  const ids = useId()
  const navigate = useNavigate()
  const recipe = plan.recipeOf(meal)
  const variation = plan.variationOf(meal)
  const variations = recipe?.variations.filter((v) => v.item.status !== 'cancelled') ?? []
  const source = meal.leftoversOf ? plan.byId.get(meal.leftoversOf) : undefined
  const leftovers = plan.meals.filter((m) => m.leftoversOf === meal.id)
  const [servings, setServings] = useState(meal.servings ? String(meal.servings) : '')
  // Changed elsewhere (Get ingredients, its Variation) and not here: shown,
  // so leaving doesn't put the old number back.
  const [seen, setSeen] = useState(meal.servings)
  if (meal.servings !== seen) {
    setSeen(meal.servings)
    if (servings === (seen ? String(seen) : ''))
      setServings(meal.servings ? String(meal.servings) : '')
  }
  const keepServings = () => {
    const n = Number(servings)
    const next = servings.trim() && Number.isInteger(n) && n >= 1 && n <= 100 ? n : null
    if (next === null && servings.trim()) setServings(meal.servings ? String(meal.servings) : '')
    else if (next !== meal.servings) updateMeal(meal.id, { servings: next })
  }
  useOnLeave(keepServings)
  const open = (m: PlannedMeal) =>
    void navigate({ to: '.', search: (prev) => ({ ...prev, item: m.id }), replace: true })

  return (
    <div className="flex flex-col gap-4">
      {recipe && (
        <ItemRow
          leading={<TypeTile colour="green" icon={ChefHatIcon} />}
          title={recipe.item.title}
          meta={['Open recipe', variation?.item.title]}
          onOpen={() => void navigate({ to: '/recipes/$id', params: { id: recipe.item.id } })}
        />
      )}
      {source && (
        <Field label="Leftovers of">
          <ItemRow
            leading={<TypeTile colour="green" icon={UtensilsIcon} size="sm" />}
            title={plan.name(source)}
            meta={source.day && source.slot ? [slotName(source.day, source.slot)] : []}
            onOpen={() => open(source)}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        {variations.length > 1 && (
          <Field label="Variation" htmlFor={`${ids}-variation`}>
            <Select
              value={meal.variation ?? ''}
              items={variations.map((v) => ({ value: v.item.id, label: v.item.title }))}
              onValueChange={(v) => v && setMealVariation(meal.id, v)}
            >
              <SelectTrigger id={`${ids}-variation`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variations.map((v) => (
                  <SelectItem key={v.item.id} value={v.item.id}>
                    {v.item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {!meal.leftoversOf && (
          <Field label="Servings" htmlFor={`${ids}-servings`}>
            <Input
              id={`${ids}-servings`}
              inputMode="numeric"
              autoComplete="off"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              onBlur={keepServings}
            />
          </Field>
        )}
        {!meal.leftoversOf && meal.mine && plan.spaces.spaces.length > 1 && (
          <Field label="For">
            <SpaceSelect
              spaces={plan.spaces.spaces}
              value={meal.space ?? plan.spaces.personal ?? ''}
              onChange={(space) => setMealSpace(meal, space, plan.meals)}
              label="For"
              size="default"
              className="w-full"
            />
          </Field>
        )}
      </div>
      {!meal.leftoversOf && <MealIngredients meal={meal} pantry={plan.food.pantry} />}
      {leftovers.length > 0 && (
        <Field label="Leftovers">
          <div className="-mx-3 flex flex-col">
            {leftovers.map((m) => (
              <ItemRow
                key={m.id}
                leading={<TypeTile colour="green" icon={RotateCcwIcon} size="sm" />}
                title={m.day && m.slot ? slotName(m.day, m.slot) : 'Leftovers'}
                onOpen={() => open(m)}
                menu={
                  <MoreMenu>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => removeMeal(m, plan.name(m), plan.meals)}
                    >
                      Remove
                    </DropdownMenuItem>
                  </MoreMenu>
                }
              />
            ))}
          </div>
        </Field>
      )}
    </div>
  )
}
