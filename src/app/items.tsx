import { EllipsisIcon, PinIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { ItemDialog } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toggle } from '@/components/ui/toggle'
import { convertItem, queue, setMark, useItem, useMarks, type Item } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { convertTargets, itemTitle, MARK_LABEL, opensAsPage, typeLook } from '@/lib/item-types'
import { deleteItem, useCloseItem } from './item-navigation'
import { toast } from '@/components/ui/sonner'

/** An Item's mark (star, pin) and its "…" menu: Convert to, Delete. */
export function ItemActions({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const marks = useMarks(queue)
  const look = typeLook(item.type)
  const targets = convertTargets(item.type)
  const MarkIcon = look.mark === 'pinned' ? PinIcon : StarIcon
  return (
    <>
      {look.mark && (
        <Toggle
          aria-label={MARK_LABEL[look.mark]}
          pressed={marks.has(item.id)}
          onPressedChange={(on) => setMark(item.id, on)}
        >
          <MarkIcon />
        </Toggle>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {targets.length > 0 && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Convert to</DropdownMenuLabel>
                {targets.map((t) => (
                  <DropdownMenuItem
                    key={t.key}
                    onClick={() => {
                      convertItem(item.id, t.key)
                      toast(`Converted into a ${t.label}`)
                    }}
                  >
                    <t.icon /> {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

/** What an Item holds, until its Type's own editor (Notes, Tasks) takes over. */
export function ItemContent({ item }: { item: Item }) {
  if (!item.body) return null
  return <p className="whitespace-pre-wrap text-muted-foreground">{item.body}</p>
}

/** The popup for the Item named in the page's ?item= (ITM-001). */
export function ItemPopup({ id }: { id: string | undefined }) {
  const close = useCloseItem()
  const isMobile = useIsMobile()
  const { item, status } = useItem(queue, id ?? '')
  if (!id || status === 'loading') return null
  const onOpenChange = (open: boolean) => !open && close()

  if (!item) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>This can't be found</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  // Converted into a Type that opens on its own page here: that is where it is.
  if (opensAsPage(item.type, isMobile)) return null

  const look = typeLook(item.type)
  return (
    <ItemDialog
      open
      onOpenChange={onOpenChange}
      colour={look.colour}
      icon={look.icon}
      typeLabel={look.label}
      title={itemTitle(item)}
      actions={
        <ItemActions
          item={item}
          onDelete={() => {
            close()
            deleteItem(item)
          }}
        />
      }
    >
      <ItemContent item={item} />
    </ItemDialog>
  )
}
