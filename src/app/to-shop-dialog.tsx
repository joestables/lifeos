import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { queue, useFood, type Item, type ShoppingList } from '@/data'
import { itemTitle } from '@/lib/item-types'
import { shopText, writtenLines } from '@/lib/shopping'

/** "Add to"'s first choice: a new food shop. */
export const NEW = 'new'

/** "Shopping list": a new food shop, or onto an open one (patterns.md#shopping). */
export function ToShopDialog({
  item,
  shops,
  onChoose,
  onClose,
}: {
  item: Item
  shops: ShoppingList[]
  onChoose: (onto: string) => void
  onClose: () => void
}) {
  const food = useFood(queue)
  const [onto, setOnto] = useState(NEW)
  const names = writtenLines(shopText(item), food.pantry).map(
    (l) => l.pantry?.name ?? l.amount.name,
  )
  const items = [
    { value: NEW, label: 'A new food shop' },
    ...shops.map((s) => ({ value: s.item.id, label: itemTitle(s.item) })),
  ]
  return (
    <Dialog open onOpenChange={(on) => !on && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shopping list</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{names.join(' · ')}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to-shop">Add to</Label>
          <Select value={onto} items={items} onValueChange={(v) => v && setOnto(String(v))}>
            <SelectTrigger id="to-shop" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onChoose(onto)
              onClose()
            }}
          >
            {onto === NEW ? 'Convert' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
