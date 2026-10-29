import { useNavigate } from '@tanstack/react-router'
import { formatAmount, isUnit, type ParsedLine } from '@lifeos/food'
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, UtensilsIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AddRow,
  DateField,
  OfferRow,
  PageHeader,
  PantryAisle,
  ShoppingLine,
  TypeScope,
  TypeTile,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { Tabs, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  addMeals,
  addShopLine,
  deleteShopLine,
  keepEntry,
  positionBetween,
  queue,
  removeMeal,
  tick,
  updateItem,
  useFood,
  useFoodSpaces,
  useLiveShopping,
  useMeals,
  useSettings,
  useShopMeals,
  useShopping,
  type ListLine,
  type PantryEntry,
  type ShopLine,
  type ShoppingList,
} from '@/data'
import { todayIn } from '@lifeos/recurrence'
import { dateName } from '@/lib/dates'
import { itemTitle } from '@/lib/item-types'
import { nameKey } from '@/lib/pantry'
import { amountOf, extraChoices, mealLabel, shopRows } from '@/lib/shopping'
import { total } from '@lifeos/food'
import { CompleteListDialog } from './complete-list'
import { deleteItem } from './item-navigation'
import { completeList, untickedOf } from './shop-actions'
import { MoreMenu } from './more-menu'
import { PantryPicker } from './pantry-picker'
import { SpaceSelect } from './space-select'

const SLOTS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

/** A line's amount, as typed first in the field ("2 milk"). */
const amountFields = (a: ParsedLine) => ({
  ...(a.qty !== null && { qty: a.qty }),
  ...(a.qtyMax !== null && { qty_max: a.qtyMax }),
  ...(a.approx && { approx: true }),
  ...(a.unit && { unit: a.unit }),
})

const lastPosition = (lines: readonly ShopLine[]) =>
  lines.reduce<string | null>((p, l) => (p === null || l.position > p ? l.position : p), null)

/**
 * Ticks lines, and offers Done once every line is ticked (SHP-001 4, 5). A
 * needed staple or Essential not yet stored is stored first, then ticked,
 * which clears its out of stock or Required (SHP-003 4).
 */
function useTick(list: ShoppingList, onDone: () => void) {
  return (ids: readonly string[], on: boolean) => {
    const byId = new Map(list.lines.map((l) => [l.id, l]))
    const real = ids.filter((i) => !byId.get(i)?.auto)
    if (on)
      for (const i of ids) {
        const l = byId.get(i)
        if (!l?.auto) continue
        real.push(
          addShopLine(list.item.id, {
            position: positionBetween(lastPosition(list.lines), null),
            pantry_id: l.pantry_id,
            needed_space_id: l.needed_space_id,
          }),
        )
      }
    if (real.length) tick(list.item.id, real, on)
    const left = list.toBuy.filter((l) => !l.checked && !ids.includes(l.id))
    if (on && left.length === 0 && list.item.status === 'active')
      toast("Everything's ticked", {
        action: { label: 'Done', onClick: () => completeList(list, onDone) },
      })
  }
}

/** Edit details… (SHP-001 2): name, date and, for a food shop, its Space. */
function DetailsDialog({ list, onClose }: { list: ShoppingList; onClose: () => void }) {
  const spaces = useFoodSpaces(queue)
  const [title, setTitle] = useState(list.item.title)
  const [day, setDay] = useState(list.item.do_on)
  const [space, setSpace] = useState(list.item.space_id)
  const save = () => {
    if (!title.trim()) return
    const patch = {
      ...(title.trim() !== list.item.title && { title: title.trim() }),
      ...(day !== list.item.do_on && { do_on: day }),
      ...(space !== list.item.space_id && { space_id: space }),
    }
    if (Object.keys(patch).length) updateItem(list.item.id, patch)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{list.kind === 'food' ? 'Shop details' : 'List details'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="list-title">Name</Label>
            <Input id="list-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label>Date</Label>
              <DateField value={day} onChange={setDay} />
            </div>
            {spaces.spaces.length > 1 && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label>For</Label>
                <SpaceSelect
                  label="For"
                  size="default"
                  className="w-full"
                  spaces={spaces.spaces}
                  value={space}
                  onChange={setSpace}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Add a meal (SHP-002 4): the plan's Meals from today on no open shop. */
function AddMealDialog({ list, onClose }: { list: ShoppingList; onClose: () => void }) {
  const { meals } = useMeals(queue)
  const { shopOf } = useShopping(queue)
  const today = todayIn(useSettings(queue).timezone)
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const free = meals
    .filter(
      (m) =>
        m.item.do_on !== null &&
        m.item.do_on >= today &&
        !m.leftoversOf &&
        // Eaten, it needs nothing bought (SHP-002 4).
        m.item.status === 'active' &&
        !shopOf.has(m.item.id),
    )
    .sort((a, b) => (a.item.do_on ?? '').localeCompare(b.item.do_on ?? ''))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a meal</DialogTitle>
        </DialogHeader>
        {free.length === 0 && (
          <p className="text-sm text-muted-foreground">Every planned meal is on a shop</p>
        )}
        <div className="flex flex-col gap-0.5">
          {free.map((m) => (
            <label
              key={m.item.id}
              className="flex h-10 items-center gap-3 rounded-sm px-1.5 hover:bg-accent"
            >
              <Checkbox
                colour="yellow"
                checked={picked.has(m.item.id)}
                onCheckedChange={(on) => {
                  const next = new Set(picked)
                  if (on) next.add(m.item.id)
                  else next.delete(m.item.id)
                  setPicked(next)
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.item.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {[dateName(m.item.do_on!), SLOTS[m.item.slot ?? '']].filter(Boolean).join(' · ')}
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={picked.size === 0}
            onClick={() => {
              addMeals(list.item.id, [...picked])
              onClose()
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const lineMenu = (list: string, l: { id: string }) => (
  <MoreMenu>
    <DropdownMenuItem variant="destructive" onClick={() => deleteShopLine(list, l.id)}>
      <Trash2Icon /> Delete
    </DropdownMenuItem>
  </MoreMenu>
)

/** A line's ×: a line I added, or one on the shop because it's needed (Joe, 25 October). */
const removeButton = (name: string, onClick: () => void) => (
  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${name}`} onClick={onClick}>
    <XIcon />
  </Button>
)

/** A food shop's page (SHP-001–003, patterns.md#shopping): All, Meals and Extra. */
function FoodShop({ list, onDone }: { list: ShoppingList; onDone: () => void }) {
  const food = useFood(queue)
  const spaces = useFoodSpaces(queue)
  const { entries } = useShopping(queue)
  const shopMeals = useShopMeals(queue, list.item.id, list.meals)
  const [tab, setTab] = useState<'all' | 'meals' | 'extra'>('all')
  const [adding, setAdding] = useState(false)
  const onTick = useTick(list, onDone)
  const id = list.item.id
  const space = list.item.space_id

  const mealName = useMemo(() => {
    const names = new Map(shopMeals.map((m) => [m.meal_id, mealLabel(m)]))
    return (meal: string) => names.get(meal)
  }, [shopMeals])
  const staples = useMemo(
    () =>
      new Set(
        entries.filter((e) => e.space_id === space && e.kind === 'staple').map((e) => e.pantry_id),
      ),
    [entries, space],
  )
  const groups = shopRows(list.lines, food.pantry, staples)
  const rowCount = groups.reduce((n, g) => n + g.rows.length, 0)
  const pantryName = (p: string) => food.pantry.get(p)?.name ?? ''
  const own = list.lines
    .filter((l) => l.heading === null && l.meal_id === null)
    .sort((a, b) =>
      ((a.pantry_id && pantryName(a.pantry_id)) || a.text || '').localeCompare(
        (b.pantry_id && pantryName(b.pantry_id)) || b.text || '',
      ),
    )
  const mealPantry = new Set(
    list.lines.filter((l) => l.meal_id && l.pantry_id).map((l) => l.pantry_id!),
  )
  // Only what I added, or what is needed, counts as Added (not a Meal's line).
  const ownPantry = new Set(own.filter((l) => l.pantry_id).map((l) => l.pantry_id!))
  const choices = extraChoices(entries, space, mealPantry)
  const spaceName = (s: string) =>
    spaces.spaces.find((x) => x.id === s)?.name ?? spaces.householdName(s) ?? 'Personal'
  const neededHere = (p: string) =>
    entries.find((e) => e.space_id === space && e.pantry_id === p && e.needed)

  const add = (choice: { pantry: PantryEntry } | { text: string }, amount: ParsedLine) =>
    addShopLine(id, {
      position: positionBetween(lastPosition(list.lines), null),
      ...('pantry' in choice ? { pantry_id: choice.pantry.id } : { text: choice.text }),
      ...amountFields(amount),
    })
  /** Off the shop: unmarked where it's needed, and any unticked line I added for it gone. */
  const takeOff = (pantry: string) => {
    const was = neededHere(pantry)
    if (was) keepEntry(space, pantry, was.kind as 'staple' | 'essential', false)
    for (const l of own)
      if (l.pantry_id === pantry && !l.checked && !l.auto) deleteShopLine(id, l.id)
  }
  const remove = (l: ListLine) => (l.pantry_id ? takeOff(l.pantry_id) : deleteShopLine(id, l.id))
  /** On the shop: marked needed where its Space keeps it, else a line of its own. */
  const putOn = (pantry: string, kind: 'staple' | 'essential', kept: boolean) => {
    if (kept) keepEntry(space, pantry, kind, true)
    else
      addShopLine(id, {
        position: positionBetween(lastPosition(list.lines), null),
        pantry_id: pantry,
      })
  }

  const picker = (
    <PantryPicker
      pantry={food.pantry}
      label="Add to the shop"
      typedLabel={(name) => `Add "${name}" as typed`}
      onPick={add}
    />
  )
  const usedBy = (p: string) =>
    [
      ...new Set(
        list.lines
          .filter((l) => l.pantry_id === p && l.meal_id)
          .map((l) => mealName(l.meal_id!))
          .filter(Boolean),
      ),
    ].join(', ')

  const addStaples = (
    <PantryAisle label="Add staples">
      {choices.staples.length === 0 && (
        <p className="px-3 pb-2.5 text-sm text-muted-foreground">None for these meals</p>
      )}
      {choices.staples.map((c) => (
        <OfferRow
          key={c.pantry_id}
          name={pantryName(c.pantry_id)}
          meta={c.needed ? 'Out of stock' : usedBy(c.pantry_id)}
          added={c.needed || ownPantry.has(c.pantry_id)}
          onToggle={(on) => (on ? putOn(c.pantry_id, 'staple', true) : takeOff(c.pantry_id))}
        />
      ))}
    </PantryAisle>
  )
  const addEssentials = (
    <PantryAisle label="Add essentials">
      {choices.essentials.length === 0 && (
        <p className="px-3 pb-2.5 text-sm text-muted-foreground">No essentials yet</p>
      )}
      {choices.essentials.map((c) => (
        <OfferRow
          key={c.pantry_id}
          name={pantryName(c.pantry_id)}
          meta={
            c.required
              ? 'Required'
              : spaces.spaces.length > 1
                ? c.spaces.map(spaceName).join(' · ')
                : undefined
          }
          added={c.required || ownPantry.has(c.pantry_id)}
          onToggle={(on) =>
            on ? putOn(c.pantry_id, 'essential', c.spaces.includes(space)) : takeOff(c.pantry_id)
          }
        />
      ))}
    </PantryAisle>
  )

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">
            All <TabsCount>{rowCount}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="meals">
            Meals <TabsCount>{shopMeals.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="extra">
            Extra <TabsCount>{own.length}</TabsCount>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'all' && picker}
      {tab === 'all' && (
        <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {groups.map((g) => (
            <PantryAisle key={g.aisle} label={g.label}>
              {g.rows.map((r) => (
                <ShoppingLine
                  key={r.key}
                  name={r.name}
                  amount={r.amount}
                  checked={r.checked}
                  onCheck={(on) => onTick(r.ids, on)}
                  menu={
                    // Ticked, it's bought: nothing to take off (as on Extra).
                    r.own && !r.checked
                      ? removeButton(r.name, () => remove(r.own as ListLine))
                      : undefined
                  }
                />
              ))}
            </PantryAisle>
          ))}
        </div>
      )}
      {tab === 'meals' && (
        <div className="flex flex-col gap-4">
          <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {shopMeals.map((m) => {
              const lines = list.lines.filter(
                (l) => l.meal_id === m.meal_id && !(l.pantry_id && staples.has(l.pantry_id)),
              )
              return (
                <Card
                  key={m.meal_id}
                  role="group"
                  aria-label={m.title}
                  className="gap-0 px-2 py-1.5"
                >
                  <div className="flex items-center gap-3 px-3 pt-2 pb-1.5">
                    <TypeTile colour="green" icon={UtensilsIcon} size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{m.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[
                          m.do_on ? dateName(m.do_on) : null,
                          SLOTS[m.slot ?? ''],
                          m.servings ? `Serves ${m.servings}` : null,
                          m.personal && spaces.spaces.length > 1 ? 'Personal' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <MoreMenu>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => removeMeal(id, m.meal_id)}
                      >
                        <XIcon /> Take off the shop
                      </DropdownMenuItem>
                    </MoreMenu>
                  </div>
                  {lines.map((l) => (
                    <ShoppingLine
                      key={l.id}
                      name={(l.pantry_id && pantryName(l.pantry_id)) || l.text || ''}
                      amount={total([amountOf(l)])}
                      checked={l.checked}
                      onCheck={(on) => onTick([l.id], on)}
                    />
                  ))}
                </Card>
              )
            })}
          </div>
          <Button variant="outline" className="self-start" onClick={() => setAdding(true)}>
            <PlusIcon /> Add a meal
          </Button>
        </div>
      )}
      {tab === 'extra' && (
        // A computer: Add staples over Add essentials, what I added beside
        // them; a phone: what I added first (Joe, 25 October).
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4 max-lg:order-last">
            {addStaples}
            {addEssentials}
          </div>
          <div className="flex flex-col gap-3">
            {picker}
            <PantryAisle label="Added">
              {own.length === 0 && (
                <p className="px-3 pb-2.5 text-sm text-muted-foreground">Nothing added</p>
              )}
              {own.map((l) => {
                const name = (l.pantry_id && pantryName(l.pantry_id)) || l.text || ''
                return (
                  <ShoppingLine
                    key={l.id}
                    name={name}
                    amount={formatAmount({
                      qty: l.qty,
                      qtyMax: l.qty_max,
                      approx: l.approx,
                      unit: l.unit && isUnit(l.unit) ? l.unit : null,
                    })}
                    meta={
                      l.auto === 'staple'
                        ? 'Out of stock'
                        : l.auto === 'essential'
                          ? 'Required'
                          : undefined
                    }
                    checked={l.checked}
                    onCheck={(on) => onTick([l.id], on)}
                    menu={l.checked ? undefined : removeButton(name, () => remove(l))}
                  />
                )
              })}
            </PantryAisle>
          </div>
        </div>
      )}
      {adding && <AddMealDialog list={list} onClose={() => setAdding(false)} />}
    </>
  )
}

/** A list's page (SHP-001 3): lines under my own subheadings, household items matched. */
function ListLines({ list, onDone }: { list: ShoppingList; onDone: () => void }) {
  const food = useFood(queue)
  const onTick = useTick(list, onDone)
  const id = list.item.id
  const sorted = [...list.lines].sort((a, b) => (a.position < b.position ? -1 : 1))
  // Lines before the first subheading, then each subheading's.
  const groups: { heading: ShopLine | null; lines: ShopLine[] }[] = [{ heading: null, lines: [] }]
  for (const l of sorted) {
    if (l.heading !== null) groups.push({ heading: l, lines: [] })
    else groups.at(-1)!.lines.push(l)
  }
  const household = (text: string) =>
    [...food.pantry.values()].find(
      (p) => p.kind === 'household' && nameKey(p.name) === nameKey(text),
    )
  const addTo = (i: number, text: string) => {
    const g = groups[i]!
    const after = g.lines.at(-1)?.position ?? g.heading?.position ?? null
    const next = groups[i + 1]?.heading?.position ?? null
    const p = household(text)
    addShopLine(id, {
      position: positionBetween(after, next),
      ...(p ? { pantry_id: p.id } : { text }),
    })
  }
  const shown = groups.filter((g, i) => g.heading || g.lines.length || groups.length === 1 || i > 0)
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {shown.map((g) => {
        const i = groups.indexOf(g)
        const label = g.heading?.heading ?? 'Items'
        return (
          <PantryAisle key={g.heading?.id ?? 'top'} label={label} title={g.heading !== null}>
            {/* A ticked line stays in its place (SHP-001 4; Joe, 26 October). */}
            {g.lines.map((l) => (
              <ShoppingLine
                key={l.id}
                name={(l.pantry_id && food.pantry.get(l.pantry_id)?.name) || l.text || ''}
                meta={l.pantry_id ? 'Household' : undefined}
                checked={l.checked}
                onCheck={(on) => onTick([l.id], on)}
                menu={lineMenu(id, l)}
              />
            ))}
            <AddRow
              placeholder={g.heading ? `Add to ${label}` : 'Add an item'}
              onAdd={(text) => addTo(i, text)}
              className="px-3 pb-1.5"
            />
          </PantryAisle>
        )
      })}
      <AddRow
        placeholder="Add a subheading"
        onAdd={(heading) =>
          addShopLine(id, { position: positionBetween(lastPosition(list.lines), null), heading })
        }
      />
    </div>
  )
}

/** A Shopping list's own page (ITM-006 1): a food shop's or a list's. */
export function ShopPage({ list }: { list: ShoppingList }) {
  const navigate = useNavigate()
  const spaces = useFoodSpaces(queue)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  useLiveShopping(list.item.id)
  const back = () =>
    void navigate({ to: '/shopping', search: list.kind === 'list' ? { tab: 'lists' } : {} })
  const meta = [
    list.item.do_on ? dateName(list.item.do_on) : null,
    spaces.spaces.length > 1 ? (spaces.householdName(list.item.space_id) ?? 'Personal') : null,
    list.item.status === 'done' ? 'Done' : null,
  ].filter(Boolean)
  return (
    <TypeScope colour="yellow">
      <PageHeader
        back={{ label: 'Shopping', onClick: back }}
        title={itemTitle(list.item)}
        trailing={
          <MoreMenu>
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <PencilIcon /> Edit details…
            </DropdownMenuItem>
            {list.item.status === 'active' ? (
              <DropdownMenuItem
                onClick={() => (untickedOf(list) ? setConfirming(true) : completeList(list, back))}
              >
                <CheckIcon /> Complete list
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => updateItem(list.item.id, { status: 'active' })}>
                <CheckIcon /> Not done
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                back()
                deleteItem(list.item)
              }}
            >
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </MoreMenu>
        }
      />
      <div className="flex flex-col gap-4 px-5 pb-16 sm:px-9 sm:pb-12">
        {meta.length > 0 && (
          <p className="-mt-3 text-sm text-muted-foreground tabular-nums">{meta.join(' · ')}</p>
        )}
        {list.kind === 'food' ? (
          <FoodShop list={list} onDone={back} />
        ) : (
          <ListLines list={list} onDone={back} />
        )}
      </div>
      {editing && <DetailsDialog list={list} onClose={() => setEditing(false)} />}
      {confirming && (
        <CompleteListDialog list={list} onClose={() => setConfirming(false)} onDone={back} />
      )}
    </TypeScope>
  )
}
