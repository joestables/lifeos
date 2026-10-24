import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { DateField } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createList, queue, useFoodSpaces, useMeals, useShopping, useSettings } from '@/data'
import { todayIn } from '@lifeos/recurrence'
import { dateName } from '@/lib/dates'
import { SpaceSelect } from './space-select'

const SLOTS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' } as const

/**
 * New shop or New list (SHP-001 2, patterns.md#shopping): a name and a
 * date; a shop also its Space and the plan's Meals from today, those on no
 * other open shop, each toggled (SHP-002). Made, it opens. From a day's
 * "+" on Plan, it is dated that day (PLN-008 4).
 */
export function NewListDialog({
  kind,
  day: initialDay = null,
  onClose,
}: {
  kind: 'food' | 'list'
  day?: string | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const spaces = useFoodSpaces(queue)
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const { meals } = useMeals(queue)
  const { shopOf, byId } = useShopping(queue)
  const [title, setTitle] = useState(kind === 'food' ? 'Food shop' : '')
  const [day, setDay] = useState<string | null>(initialDay)
  const [space, setSpace] = useState<string | null>(null)
  const [chosen, setChosen] = useState<ReadonlySet<string> | null>(null)

  const offered = useMemo(
    () =>
      meals
        .filter(
          (m) => m.item.do_on !== null && m.item.do_on >= today && m.item.status !== 'cancelled',
        )
        .filter((m) => !m.leftoversOf)
        .sort(
          (a, b) =>
            (a.item.do_on ?? '').localeCompare(b.item.do_on ?? '') ||
            Object.keys(SLOTS).indexOf(a.item.slot ?? '') -
              Object.keys(SLOTS).indexOf(b.item.slot ?? ''),
        ),
    [meals, today],
  )
  const free = (id: string) => !shopOf.has(id)
  const picked = chosen ?? new Set(offered.filter((m) => free(m.item.id)).map((m) => m.item.id))
  // A shop is the Household's of its first Household Meal to start (SHP-001 6).
  const firstHousehold = offered.find(
    (m) => picked.has(m.item.id) && spaces.householdName(m.item.space_id),
  )?.item.space_id
  const forSpace = space ?? firstHousehold ?? spaces.home ?? spaces.personal ?? ''
  const days = [...new Set(offered.map((m) => m.item.do_on!))]

  const create = () => {
    const meals = kind === 'food' ? offered.filter((m) => picked.has(m.item.id)) : []
    const id = createList({
      title: title.trim() || (kind === 'food' ? 'Food shop' : 'List'),
      kind,
      do_on: day ?? (kind === 'food' ? (meals[0]?.item.do_on ?? null) : null),
      ...(forSpace && { space_id: forSpace }),
      meals: meals.map((m) => m.item.id),
    })
    onClose()
    void navigate({ to: '/shopping/$id', params: { id } })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === 'food' ? 'New shop' : 'New list'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="list-name">Name</Label>
            <Input id="list-name" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label>Date</Label>
              <DateField value={day} onChange={setDay} />
            </div>
            {kind === 'food' && spaces.spaces.length > 1 && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label>For</Label>
                <SpaceSelect
                  label="For"
                  size="default"
                  className="w-full"
                  spaces={spaces.spaces}
                  value={forSpace}
                  onChange={setSpace}
                />
              </div>
            )}
          </div>
          {kind === 'food' && offered.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Meals</Label>
              <div className="flex flex-col gap-3">
                {days.map((d) => (
                  <div key={d} className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-muted-foreground">{dateName(d)}</span>
                    {offered
                      .filter((m) => m.item.do_on === d)
                      .map((m) => {
                        const elsewhere = shopOf.get(m.item.id)
                        const note = elsewhere
                          ? `On ${byId.get(elsewhere)?.item.title ?? 'another shop'}`
                          : spaces.householdName(m.item.space_id)
                            ? undefined
                            : spaces.spaces.length > 1
                              ? 'Personal'
                              : undefined
                        return (
                          <label
                            key={m.item.id}
                            className="flex h-10 items-center gap-3 rounded-sm px-1.5 hover:bg-accent has-disabled:opacity-50"
                          >
                            <Checkbox
                              colour="yellow"
                              disabled={!!elsewhere}
                              checked={picked.has(m.item.id)}
                              onCheckedChange={(on) => {
                                const next = new Set(picked)
                                if (on) next.add(m.item.id)
                                else next.delete(m.item.id)
                                setChosen(next)
                              }}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {m.item.title}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {[SLOTS[m.item.slot as keyof typeof SLOTS], note]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </label>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
