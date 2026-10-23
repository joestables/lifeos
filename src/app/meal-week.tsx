import { addDays } from '@lifeos/recurrence'
import { CopyIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  AddMealButton,
  MealCard,
  MealDay,
  MealSlot,
  MealWeek,
  PlanToolbar,
} from '@/components/lifeos'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePhotoUrls } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMealDrag } from '@/hooks/use-meal-drag'
import { fromIsoDay, shortDate } from '@/lib/dates'
import { SLOTS, SLOT_LABEL, weekMeals, type PlannedMeal, type SlotKey } from '@/lib/meals'
import { weekOf, weekTitle } from '@/lib/plan'
import { MealPicker } from './add-meal'
import { useOpenItem } from './item-navigation'
import { copyMeals, moveMeal, useMealPlan } from './meal-actions'
import { CopyWeekDialog } from './meal-dialogs'
import { MoreMenu } from './more-menu'
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
  const [copying, setCopying] = useState(false)
  const drag = useMealDrag((id, drop) => {
    const m = plan.byId.get(id)
    const [d, s] = drop.split(':')
    if (m && d && s) moveMeal(m, plan.name(m), d, s as SlotKey)
  })

  // A phone opens on today (MPL-001 2).
  const days = useRef<HTMLDivElement>(null)
  const monday = week[0]
  useEffect(() => {
    if (!isMobile) return
    days.current?.querySelector(`[data-day="${today}"]`)?.scrollIntoView({ block: 'start' })
  }, [isMobile, today, monday])

  const card = (m: PlannedMeal) => {
    const recipe = plan.recipeOf(m)
    const variation = plan.variationOf(m)
    const several =
      (recipe?.variations.filter((v) => v.item.status !== 'cancelled').length ?? 0) > 1
    return (
      <div key={m.id} className="touch-manipulation select-none" {...drag.handle(m.id)}>
        <MealCard
          personal={shared && show === ALL && m.space === personal}
          household={
            spaces.length > 2 && show === ALL ? plan.spaces.householdName(m.space) : undefined
          }
          name={plan.name(m)}
          photo={m.picture && photos.get(m.picture)}
          servings={m.servings ?? undefined}
          variation={several ? variation?.item.title : undefined}
          kind={m.leftoversOf ? 'leftovers' : m.variation ? 'recipe' : 'typed'}
          eaten={m.status === 'done'}
          dragging={drag.dragging === m.id}
          onOpen={() => open({ id: m.id, type: 'meal' })}
        />
      </div>
    )
  }

  const slot = (d: string, s: SlotKey, label: boolean) => {
    const key = `${d}:${s}`
    const list = meals.get(key) ?? []
    return (
      <MealSlot
        key={key}
        slot={SLOT_LABEL[s]}
        label={label}
        drop={key}
        adding={adding === key}
        dropping={drag.over === key}
        add={
          <Popover open={adding === key} onOpenChange={(on) => setAdding(on ? key : null)}>
            <PopoverTrigger
              render={<AddMealButton slot={SLOT_LABEL[s]} dropping={drag.over === key} />}
            />
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
      <PlanToolbar
        title={weekTitle(week[0]!)}
        day={day}
        onChooseDay={onDay}
        layout="week"
        onToday={() => onDay(today)}
        onPrevious={() => onDay(addDays(day, -7))}
        onNext={() => onDay(addDays(day, 7))}
        step="week"
        action={
          <>
            {shared && (
              <SpaceSelect
                all
                spaces={spaces}
                value={show}
                onChange={keep}
                label="Show"
                className="w-36"
              />
            )}
            <MoreMenu>
              <DropdownMenuItem onClick={() => setCopying(true)}>
                <CopyIcon /> Copy this week…
              </DropdownMenuItem>
            </MoreMenu>
          </>
        }
      />
      {copying && (
        <CopyWeekDialog
          day={addDays(week[0]!, 7)}
          onCopy={(to) => copyMeals(shown, week[0]!, to)}
          onClose={() => setCopying(false)}
        />
      )}
      {isMobile ? (
        <div ref={days} className="flex flex-col gap-5">
          {week.map((d) => {
            const date = fromIsoDay(d)
            return (
              <div key={d} data-day={d} className="scroll-mt-4">
                <MealDay
                  name={shortDate(date).slice(0, 3)}
                  date={`${date.getDate()} ${month.format(date)}`}
                  today={d === today}
                >
                  {SLOTS.map((s) => slot(d, s, true))}
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
          cell={(d, s) => slot(d, s.toLowerCase() as SlotKey, false)}
        />
      )}
    </div>
  )
}
