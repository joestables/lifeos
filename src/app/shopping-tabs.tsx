import { useNavigate } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ItemRow, SectionLabel, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { queue, useFoodSpaces, useShopping, type ShoppingList } from '@/data'
import { dateName } from '@/lib/dates'
import { itemTitle } from '@/lib/item-types'
import { deleteItem } from './item-navigation'
import { MoreMenu } from './more-menu'

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

/** Shopping → Food (SHP-001): the food shops; staples and Essentials are the Pantry's (SHP-005). */
export function FoodTab() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Lists kind="food" label="Shops" />
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
