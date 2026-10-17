import { EllipsisIcon, ExternalLinkIcon, PinIcon, StarIcon, Trash2Icon } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Toggle } from '@/components/ui/toggle'
import { googleEventUrl, queue, setMark, useItem, useMarks, type Item } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { convertTargets, itemTitle, MARK_LABEL, opensAsPage, typeLook } from '@/lib/item-types'
import { useConvert } from './convert'
import { EventDetails, EventTitle, GoogleEventDetails } from './event-details'
import { useGoogleSource } from './google-source'
import { deleteItem, draftNote, useCloseItem } from './item-navigation'
import { NoteBody } from './note-body'
import { ItemReminders } from './item-reminders'
import { Field, ItemLabels, TaskDetails, TaskTitle } from './task-details'
import { tickThought } from './thought-actions'

/**
 * An Item's mark (star, pin) and its "…" menu: Convert to, Delete. An Event
 * from an incoming-only Google calendar offers only "Open in Google
 * Calendar" (GCL-004).
 */
export function ItemActions({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const marks = useMarks(queue)
  const look = typeLook(item.type)
  const google = useGoogleSource(item)
  const targets = google?.readOnly ? [] : convertTargets(item.type)
  const convert = useConvert()
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
                  <DropdownMenuItem key={t.key} onClick={() => convert(item, t.key)}>
                    <t.icon /> {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          {google?.readOnly ? (
            google.link && (
              <DropdownMenuItem
                render={
                  <a
                    href={googleEventUrl(google.ref!.external_id, google.link.calendar_id)}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <ExternalLinkIcon /> Open in Google Calendar
              </DropdownMenuItem>
            )
          ) : (
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          )}
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

/** The popup for the Item named in the page's ?item= (ITM-001); a new Note with ?new=note. */
export function ItemPopup({ id, isNew = false }: { id: string | undefined; isNew?: boolean }) {
  const close = useCloseItem()
  const isMobile = useIsMobile()
  const { item: found, status } = useItem(queue, id ?? '')
  const google = useGoogleSource({ id: id ?? '', type: found?.type ?? '' })
  const draft = isNew && !found
  const item = found ?? (draft && id ? draftNote(id) : undefined)
  if (!id || (status === 'loading' && !draft)) return null
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
      wide={item.type === 'note'}
      standard={item.type === 'task' || item.type === 'event'}
      leading={
        item.type === 'thought' && (
          <Checkbox
            colour={look.colour}
            aria-label="Done"
            className="size-5"
            checked={item.status === 'done'}
            onCheckedChange={(on) => tickThought(item, on)}
          />
        )
      }
      titleField={
        item.type === 'note' ? (
          <NoteBody key={item.id} item={item} draft={draft} />
        ) : item.type === 'task' ? (
          <TaskTitle key={item.id} item={item} />
        ) : item.type === 'event' && google?.readOnly ? (
          <div className="pt-1 text-day">{itemTitle(item)}</div>
        ) : (
          item.type === 'event' && <EventTitle key={item.id} item={item} />
        )
      }
      actions={
        !draft && (
          <ItemActions
            item={item}
            onDelete={() => {
              close()
              deleteItem(item)
            }}
          />
        )
      }
    >
      {item.type === 'task' ? (
        <TaskDetails key={item.id} item={item} />
      ) : item.type === 'event' && google?.readOnly ? (
        <GoogleEventDetails key={item.id} item={item} />
      ) : item.type === 'event' ? (
        <EventDetails key={item.id} item={item} />
      ) : item.type === 'thought' ? (
        // A Thought: its text, Reminders at a set time (REM-003) and Labels (ITM-005).
        <div className="flex flex-col gap-4">
          <ItemContent item={item} />
          <Field label="Reminders">
            <ItemReminders item={item} />
          </Field>
          <Field label="Labels">
            <ItemLabels item={item} />
          </Field>
        </div>
      ) : (
        item.type !== 'note' && <ItemContent item={item} />
      )}
    </ItemDialog>
  )
}
