import { useNavigate } from '@tanstack/react-router'
import { ShoppingCartIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ItemRow, KeptRow, SectionLabel, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  addPantry,
  keepEntry,
  queue,
  removeEntry,
  useFood,
  useFoodSpaces,
  useShopping,
  type ShoppingList,
} from '@/data'
import { dateName } from '@/lib/dates'
import { itemTitle } from '@/lib/item-types'
import { deleteItem } from './item-navigation'
import { MoreMenu } from './more-menu'
import { PantryPicker } from './pantry-picker'
import { SpaceSelect } from './space-select'

const cart = <TypeTile colour="yellow" icon={ShoppingCartIcon} />

/** Dated lists by date, then undated A–Z (SHP-001 1). */
const byDate = (a: ShoppingList, b: ShoppingList) =>
  (a.item.do_on ?? '9999').localeCompare(b.item.do_on ?? '9999') ||
  itemTitle(a.item).localeCompare(itemTitle(b.item))

/** A list's row (patterns.md#shopping): its date, Meals, Space and how far through. */
function ListRow({ list, homeSpace }: { list: ShoppingList; homeSpace: string | null }) {
  const navigate = useNavigate()
  const spaces = useFoodSpaces(queue)
  const lines = list.toBuy
  const done = list.item.status !== 'active'
  const meta = [
    list.item.do_on ? dateName(list.item.do_on) : null,
    list.kind === 'food' && list.meals.length
      ? `${list.meals.length} ${list.meals.length === 1 ? 'meal' : 'meals'}`
      : null,
    list.item.space_id !== homeSpace ? spaces.householdName(list.item.space_id) : null,
    lines.length ? `${lines.filter((l) => l.checked).length} of ${lines.length}` : null,
  ].filter((m): m is string => !!m)
  return (
    <ItemRow
      leading={cart}
      title={itemTitle(list.item)}
      meta={meta}
      done={done}
      sync={list.item.sync}
      onOpen={() => void navigate({ to: '/shopping/$id', params: { id: list.item.id } })}
      menu={
        <MoreMenu>
          <DropdownMenuItem variant="destructive" onClick={() => deleteItem(list.item)}>
            Delete
          </DropdownMenuItem>
        </MoreMenu>
      }
    />
  )
}

/** The open lists of a kind, then done ones a press away (SHP-001 1). */
function Lists({ kind, label }: { kind: 'food' | 'list'; label: string }) {
  const { lists, isLoading } = useShopping(queue)
  const { home } = useFoodSpaces(queue)
  const [showDone, setShowDone] = useState(false)
  const mine = lists.filter((l) => l.kind === kind)
  const open = mine.filter((l) => l.item.status === 'active').sort(byDate)
  const done = mine
    .filter((l) => l.item.status !== 'active')
    .sort((a, b) => b.item.updated_at.localeCompare(a.item.updated_at))
  if (!isLoading && !open.length && !done.length)
    return <EmptyState icon={ShoppingCartIcon} title={kind === 'food' ? 'No shops' : 'No lists'} />
  return (
    <section className="flex flex-col gap-1.5">
      {kind === 'food' && open.length > 0 && <SectionLabel>{label}</SectionLabel>}
      {open.map((l) => (
        <ListRow key={l.item.id} list={l} homeSpace={home} />
      ))}
      {done.length > 0 && (
        <Button variant="link" className="self-start pt-1" onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Hide done' : kind === 'food' ? 'Done shops' : 'Done lists'}
        </Button>
      )}
      {showDone && done.map((l) => <ListRow key={l.item.id} list={l} homeSpace={home} />)}
    </section>
  )
}

/** One of a Space's staples or Essentials cards (SHP-005 1, 2). */
function KeptCard({ space, kind }: { space: string; kind: 'staple' | 'essential' }) {
  const food = useFood(queue)
  const { entries } = useShopping(queue)
  const flag = kind === 'staple' ? 'Out of stock' : 'Required'
  const rows = entries
    .filter((e) => e.space_id === space && e.kind === kind)
    .map((e) => ({ ...e, name: food.pantry.get(e.pantry_id)?.name ?? '' }))
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name))
  const title = kind === 'staple' ? 'Staples' : 'Essentials'
  return (
    <Card role="group" aria-label={title} className="gap-0 px-2 py-1.5">
      <CardTitle className="px-3 pt-2.5 pb-1 text-sm text-muted-foreground">{title}</CardTitle>
      {rows.map((e) => (
        <KeptRow
          key={e.pantry_id}
          name={e.name}
          flag={flag}
          on={e.needed}
          onChange={(on) => keepEntry(space, e.pantry_id, kind, on)}
          menu={
            <MoreMenu>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => removeEntry(space, e.pantry_id)}
              >
                <XIcon /> Take off
              </DropdownMenuItem>
            </MoreMenu>
          }
        />
      ))}
      <div className="px-1 pt-1 pb-1.5">
        <PantryPicker
          pantry={food.pantry}
          label={kind === 'staple' ? 'Add a staple' : 'Add an essential'}
          typedLabel={(name) => `Add "${name}" to the Pantry`}
          onPick={(choice) => {
            const id = 'pantry' in choice ? choice.pantry.id : addPantry({ name: choice.text })
            keepEntry(space, id, kind)
          }}
        />
      </div>
    </Card>
  )
}

/** Shopping → Food (SHP-001, SHP-005): the shops, then a Space's staples and Essentials. */
export function FoodTab() {
  const spaces = useFoodSpaces(queue)
  const [chosen, setChosen] = useState<string | null>(null)
  const space = chosen ?? spaces.home ?? spaces.personal
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Lists kind="food" label="Shops" />
      {space && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SectionLabel className="mb-0 flex-1">Staples and essentials</SectionLabel>
            {spaces.spaces.length > 1 && (
              <SpaceSelect
                label="Whose"
                spaces={spaces.spaces}
                value={space}
                onChange={setChosen}
                className="w-auto"
              />
            )}
          </div>
          <div className="grid items-start gap-4 md:grid-cols-2">
            <KeptCard space={space} kind="staple" />
            <KeptCard space={space} kind="essential" />
          </div>
        </section>
      )}
    </div>
  )
}

/** Shopping → Lists (SHP-001): shopping that isn't food. */
export function ListsTab() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Lists kind="list" label="Lists" />
    </div>
  )
}
