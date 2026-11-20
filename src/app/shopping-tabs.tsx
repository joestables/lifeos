import { useNavigate } from '@tanstack/react-router'
import { CheckIcon, ShoppingCartIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ItemRow, SectionLabel, TypeTile } from '@/components/lifeos'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  queue,
  useFood,
  useFoodSpaces,
  useLiveShopping,
  useShopping,
  type ShoppingList,
} from '@/data'
import { dateName } from '@/lib/dates'
import { itemTitle, typeLook } from '@/lib/item-types'
import { shopTally } from '@/lib/shopping'
import { CompleteListDialog } from './complete-list'
import { deleteItem } from './item-navigation'
import { completeList, untickedOf } from './shop-actions'
import { MoreMenu } from './more-menu'

const SHOP = typeLook('shopping_list')
const cart = <TypeTile colour={SHOP.colour} icon={ShoppingCartIcon} />

/** Dated shops by date, then undated A–Z (SHP-001 1). */
const byDate = (a: ShoppingList, b: ShoppingList) =>
  (a.item.do_on ?? '9999').localeCompare(b.item.do_on ?? '9999') ||
  itemTitle(a.item).localeCompare(itemTitle(b.item))

/** A shop's row (patterns.md#recipes): its date, Meals, Space and how far through. */
function ShopRow({ list, homeSpace }: { list: ShoppingList; homeSpace: string | null }) {
  const navigate = useNavigate()
  const spaces = useFoodSpaces(queue)
  const { pantry } = useFood(queue)
  const { entries } = useShopping(queue)
  // A food shop counts as its All does (Joe, 25 October).
  const tally = shopTally(
    list.lines,
    pantry,
    new Set(
      entries
        .filter((e) => e.space_id === list.item.space_id && e.kind === 'staple')
        .map((e) => e.pantry_id),
    ),
  )
  const [confirming, setConfirming] = useState(false)
  const meta = [
    list.item.do_on ? dateName(list.item.do_on) : null,
    list.meals.length ? `${list.meals.length} ${list.meals.length === 1 ? 'meal' : 'meals'}` : null,
    list.item.space_id !== homeSpace ? spaces.householdName(list.item.space_id) : null,
    tally.total ? `${tally.done} of ${tally.total}` : null,
  ].filter((m): m is string => !!m)
  return (
    <>
      {confirming && <CompleteListDialog list={list} onClose={() => setConfirming(false)} />}
      <ItemRow
        leading={cart}
        title={itemTitle(list.item)}
        meta={meta}
        sync={list.item.sync}
        onOpen={() => void navigate({ to: '/shopping/$id', params: { id: list.item.id } })}
        menu={
          <MoreMenu>
            <DropdownMenuItem
              onClick={() => (untickedOf(list) ? setConfirming(true) : completeList(list))}
            >
              <CheckIcon /> Complete list
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => deleteItem(list.item)}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </MoreMenu>
        }
      />
    </>
  )
}

/**
 * Recipes → Shop (SHP-001 1): the open food shops, dated ones by date, then
 * undated. A done one leaves the tab; Search still finds it (ADR-0069).
 * Staples and Essentials are the Pantry's (SHP-005).
 */
export function ShopTab() {
  const { lists, isLoading } = useShopping(queue)
  const { home } = useFoodSpaces(queue)
  useLiveShopping()
  const open = lists
    .filter((l) => l.item.status === 'active' && l.item.archived_at === null)
    .sort(byDate)
  if (!isLoading && !open.length) return <EmptyState icon={ShoppingCartIcon} title="No shops" />
  return (
    <section className="flex max-w-reading flex-col gap-1.5">
      {open.length > 0 && <SectionLabel>Shops</SectionLabel>}
      {open.map((l) => (
        <ShopRow key={l.item.id} list={l} homeSpace={home} />
      ))}
    </section>
  )
}
