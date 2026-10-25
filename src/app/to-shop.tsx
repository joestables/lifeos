import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from '@/components/ui/sonner'
import {
  addShopLine,
  archiveItem,
  convertItem,
  positionBetween,
  queue,
  updateItem,
  useFood,
  useFoodSpaces,
  useShopping,
  type Item,
  type PantryEntry,
  type ShoppingList,
} from '@/data'
import { itemTitle } from '@/lib/item-types'
import { namesAnIngredient, shopText, writtenLines, type WrittenLine } from '@/lib/shopping'
import { NEW, ToShopDialog } from './to-shop-dialog'

/**
 * Whether Convert to offers Shopping list: only when a line names a Pantry
 * ingredient, so a Thought that isn't food never offers it (SHP-003 5; Joe,
 * 25 October).
 */
export function useCanShop(item: Item): boolean {
  const food = useFood(queue)
  if (item.type !== 'thought' && item.type !== 'note') return false
  return namesAnIngredient(writtenLines(shopText(item), food.pantry))
}

/** A Thought's lines onto a list, after what it has (SHP-003 5). */
function addLines(list: string, after: string | null, lines: WrittenLine<PantryEntry>[]) {
  let position = after
  for (const { amount, pantry } of lines) {
    position = positionBetween(position, null)
    addShopLine(list, {
      position,
      ...(pantry ? { pantry_id: pantry.id } : { text: amount.name }),
      ...(amount.qty !== null && { qty: amount.qty }),
      ...(amount.qtyMax !== null && { qty_max: amount.qtyMax }),
      ...(amount.approx && { approx: true }),
      ...(amount.unit && { unit: amount.unit }),
    })
  }
}

const lastPosition = (list: ShoppingList) =>
  list.lines.reduce<string | null>((p, l) => (p === null || l.position > p ? l.position : p), null)

/**
 * Sorting a Thought or Note into a Shopping list (SHP-003 5, ITM-006 5, 6):
 * with an open food shop, a Dialog asks whether it becomes a new one or goes
 * onto one; with none, it becomes one at once. Become one, it is a food shop,
 * "Food shop" (a Note keeps its title), in the Household where new Meals go,
 * its lines read from its text; onto one, its lines join that shop's and it
 * goes to Recently deleted. Either way it says so, with Open.
 */
export function useToShop() {
  const navigate = useNavigate()
  const food = useFood(queue)
  const spaces = useFoodSpaces(queue)
  const { lists } = useShopping(queue)
  const [asking, setAsking] = useState<Item | null>(null)
  const open = lists
    .filter((l) => l.kind === 'food' && l.item.status === 'active' && !l.item.archived_at)
    .sort((a, b) => (a.item.do_on ?? '9999').localeCompare(b.item.do_on ?? '9999'))
  const openList = (id: string) => void navigate({ to: '/shopping/$id', params: { id } })

  const make = (item: Item, onto: string) => {
    const lines = writtenLines(shopText(item), food.pantry)
    const target = open.find((l) => l.item.id === onto)
    if (target) {
      addLines(target.item.id, lastPosition(target), lines)
      archiveItem(item.id)
      toast(`Added to "${itemTitle(target.item)}"`, {
        action: { label: 'Open', onClick: () => openList(target.item.id) },
      })
      return
    }
    convertItem(item.id, 'shopping_list')
    const household = spaces.householdName(spaces.home) ? spaces.home : null
    updateItem(item.id, {
      title: item.type === 'note' && item.title.trim() ? item.title : 'Food shop',
      body: null,
      ...(household && { space_id: household }),
    })
    addLines(item.id, null, lines)
    toast('Converted into a Shopping list', {
      action: { label: 'Open', onClick: () => openList(item.id) },
    })
  }

  return {
    start: (item: Item) => (open.length ? setAsking(item) : make(item, NEW)),
    dialog: asking && (
      <ToShopDialog
        item={asking}
        shops={open}
        onChoose={(onto) => make(asking, onto)}
        onClose={() => setAsking(null)}
      />
    ),
  }
}
