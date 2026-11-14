import { addDays } from '@lifeos/recurrence'
import { useNavigate } from '@tanstack/react-router'
import { ListChecksIcon, PlusIcon, ShoppingCartIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  AddMealButton,
  MealCard,
  MealDay,
  MealSlot,
  MealWeek,
  PlanToolbar,
  SelectionBar,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createList, queue, usePhotoUrls, useShopping } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMealDrag } from '@/hooks/use-meal-drag'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { SLOTS, SLOT_LABEL, weekMeals, type PlannedMeal, type SlotKey } from '@/lib/meals'
import { itemTitle } from '@/lib/item-types'
import { weekOf, weekTitle } from '@/lib/plan'
import { AddMealDialog, MealPicker } from './add-meal'
import { useOpenItem } from './item-navigation'
import { moveMeal, useMealPlan } from './meal-actions'
import { ALL, SpaceSelect } from './space-select'

const month = new Intl.DateTimeFormat('en-GB', { month: 'short' })

const SHOWN = 'lifeos.meals.show'

/** Whose Meals the week shows, kept on this device (MPL-001 5). */
function useShown(): [string, (space: string) => void] {
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(SHOWN) ?? ALL
    } catch {
      return ALL
    }
  })
  const keep = (space: string) => {
    setShown(space)
    try {
      localStorage.setItem(SHOWN, space)
    } catch {
      // Kept for this visit only.
    }
  }
  return [shown, keep]
}

/**
 * The Meal plan's week (MPL-001–004, patterns.md#meal-plan): Monday to
 * Sunday, columns on a computer and days down a phone; a slot's "+" plans
 * a Meal, a Meal opens over the page and is dragged to another slot.
 * Select chooses Meals and Add to shop makes a new food shop of them
 * (SHP-002 1).
 */
export function WeekTab({
  day,
  today,
  onDay,
}: {
  day: string
  today: string
  onDay: (day: string) => void
}) {
  const plan = useMealPlan()
  const isMobile = useIsMobile()
  const open = useOpenItem()
  const week = weekOf(day)
  const { spaces, personal } = plan.spaces
  const shared = spaces.length > 1
  const [kept, keep] = useShown()
  const show = kept === ALL || spaces.some((s) => s.id === kept) ? kept : ALL
  const shown = show === ALL ? plan.meals : plan.meals.filter((m) => m.space === show)
  const meals = weekMeals(shown, week)
  const photos = usePhotoUrls([...meals.values()].flat().map((m) => m.picture))
  const [adding, setAdding] = useState<string | null>(null)
  // A phone plans in a Dialog: the day, and the slot tapped.
  const [planning, setPlanning] = useState<{ day: string; slot?: SlotKey } | null>(null)
  const navigate = useNavigate()
  const shopping = useShopping(queue)
  const { shopOf } = shopping
  const [chosen, setChosen] = useState<ReadonlySet<string> | null>(null)
  const selecting = chosen !== null
  // Leftovers have no lines of their own, an eaten Meal is past, and a Meal
  // on another open shop stays there (SHP-002 4).
  const choosable = (m: PlannedMeal) => !m.leftoversOf && m.status !== 'done' && !shopOf.has(m.id)
  // Why a Meal can't be chosen, said on it while choosing (Joe, 26 October).
  const unavailable = (m: PlannedMeal) => {
    if (m.leftoversOf) return 'Leftovers'
    if (m.status === 'done') return 'Eaten'
    const shop = shopOf.get(m.id)
    const item = shop ? shopping.byId.get(shop)?.item : undefined
    return shop ? (item ? `On ${itemTitle(item)}` : 'On a shop') : undefined
  }
  const addToShop = () => {
    const picked = plan.meals
      .filter((m) => chosen?.has(m.id))
      .sort(
        (a, b) =>
          (a.day ?? '').localeCompare(b.day ?? '') ||
          SLOTS.indexOf(a.slot as SlotKey) - SLOTS.indexOf(b.slot as SlotKey),
      )
    if (!picked.length) return
    // Dated the first one's day; the Household of its first Household Meal (SHP-001 6).
    const household = picked.find((m) => plan.spaces.householdName(m.space))?.space
    const id = createList({
      title: 'Food shop',
      kind: 'food',
      do_on: picked[0]!.day,
      space_id: household ?? plan.spaces.home ?? personal ?? undefined,
      meals: picked.map((m) => m.id),
    })
    setChosen(null)
    void navigate({ to: '/shopping/$id', params: { id } })
  }
  const drag = useMealDrag((id, drop) => {
    const m = plan.byId.get(id)
    // A phone's day keeps the Meal's slot; the week's slot says its own.
    const [d, s = m?.slot] = drop.split(':')
    if (m && d && s) moveMeal(m, plan.name(m), d, s as SlotKey, plan.meals)
  })

  // A phone opens on today (MPL-001 2).
  const days = useRef<HTMLDivElement>(null)
  const monday = week[0]
  useEffect(() => {
    if (!isMobile) return
    days.current?.querySelector(`[data-day="${today}"]`)?.scrollIntoView({ block: 'start' })
  }, [isMobile, today, monday])

  // Personal is marked only among Household Meals: a week of my own is unmarked.
  const mixed = [...meals.values()].flat().some((m) => m.space !== personal)
  const card = (m: PlannedMeal) => {
    const recipe = plan.recipeOf(m)
    const variation = plan.variationOf(m)
    const several =
      (recipe?.variations.filter((v) => v.item.status !== 'cancelled').length ?? 0) > 1
    return (
      <div
        key={m.id}
        className="touch-manipulation select-none"
        {...(selecting ? {} : drag.handle(m.id))}
      >
        <MealCard
          row={isMobile}
          slot={isMobile && m.slot ? SLOT_LABEL[m.slot as SlotKey] : undefined}
          personal={shared && show === ALL && mixed && m.space === personal}
          household={
            spaces.length > 2 && show === ALL ? plan.spaces.householdName(m.space) : undefined
          }
          name={plan.name(m)}
          photo={m.picture && photos.get(m.picture)}
          servings={m.servings ?? undefined}
          variation={several ? variation?.item.title : undefined}
          kind={m.leftoversOf ? 'leftovers' : m.variation ? 'recipe' : 'typed'}
          eaten={m.status === 'done'}
          past={m.day !== null && m.day < today}
          dragging={drag.dragging === m.id}
          selecting={selecting && choosable(m)}
          unavailable={selecting ? unavailable(m) : undefined}
          selected={!!chosen?.has(m.id)}
          onSelect={(on) => {
            const next = new Set(chosen)
            if (on) next.add(m.id)
            else next.delete(m.id)
            setChosen(next)
          }}
          onOpen={() => open({ id: m.id, type: 'meal' })}
        />
      </div>
    )
  }

  const slot = (d: string, s: SlotKey) => {
    const key = `${d}:${s}`
    const list = meals.get(key) ?? []
    return (
      <MealSlot
        key={key}
        slot={SLOT_LABEL[s]}
        drop={key}
        adding={adding === key}
        dragging={drag.dragging !== null}
        add={
          <Popover open={adding === key} onOpenChange={(on) => setAdding(on ? key : null)}>
            <PopoverTrigger render={<AddMealButton slot={SLOT_LABEL[s]} />} />
            <PopoverContent align="start" className="w-80 p-2.5">
              <MealPicker plan={plan} day={d} slot={s} onDone={() => setAdding(null)} />
            </PopoverContent>
          </Popover>
        }
      >
        {list.length > 0 ? list.map(card) : undefined}
      </MealSlot>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {selecting ? (
        <SelectionBar
          count={chosen.size}
          onDone={() => setChosen(null)}
          actions={[{ label: 'Add to shop', icon: ShoppingCartIcon, onClick: addToShop }]}
        />
      ) : (
        <PlanToolbar
          title={weekTitle(week[0]!, isMobile)}
          day={day}
          onChooseDay={onDay}
          layout="week"
          onToday={() => onDay(today)}
          onPrevious={() => onDay(addDays(day, -7))}
          onNext={() => onDay(addDays(day, 7))}
          step="week"
          action={
            // On a phone its own row under the dates, so the dates show whole.
            <div className="flex w-full items-center gap-2 md:w-auto">
              {shared && (
                <SpaceSelect
                  all
                  spaces={spaces}
                  value={show}
                  onChange={keep}
                  label="Show"
                  className="w-40 min-w-0 md:w-36"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="max-md:ml-auto"
                onClick={() => setChosen(new Set())}
              >
                <ListChecksIcon /> Select
              </Button>
            </div>
          }
        />
      )}
      {planning && (
        <AddMealDialog day={planning.day} slot={planning.slot} onClose={() => setPlanning(null)} />
      )}
      {isMobile ? (
        <div ref={days} className="flex flex-col gap-3">
          {week.map((d) => {
            const date = fromIsoDay(d)
            return (
              <div key={d} data-day={d} className="scroll-mt-4">
                <MealDay
                  name={shortDate(date).slice(0, 3)}
                  date={`${date.getDate()} ${month.format(date)}`}
                  today={d === today}
                  drop={d}
                  dropping={drag.over === d}
                  action={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Add a meal on ${shortDate(date)}`}
                      onClick={() => setPlanning({ day: d })}
                    >
                      <PlusIcon />
                    </Button>
                  }
                >
                  {SLOTS.some((s) => meals.get(`${d}:${s}`)?.length) && (
                    <div className="grid gap-1.5">
                      {SLOTS.flatMap((s) => meals.get(`${d}:${s}`) ?? []).map(card)}
                    </div>
                  )}
                </MealDay>
              </div>
            )
          })}
        </div>
      ) : (
        <MealWeek
          days={week.map((d) => {
            const date = fromIsoDay(d)
            const over = drag.over?.startsWith(`${d}:`) ? drag.over.split(':')[1] : undefined
            return {
              key: d,
              name: shortDate(date).slice(0, 3),
              number: date.getDate(),
              today: d === today,
              dropping: over ? SLOT_LABEL[over as SlotKey] : undefined,
            }
          })}
          slots={SLOTS.map((s) => SLOT_LABEL[s])}
          cell={(d, s) => slot(d, s.toLowerCase() as SlotKey)}
        />
      )}
    </div>
  )
}
