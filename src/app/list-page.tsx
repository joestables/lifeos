import { useNavigate } from '@tanstack/react-router'
import { CheckIcon, PencilIcon, PinIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { AddRow, PageHeader, PantryAisle, ShoppingLine, Text, TypeScope } from '@/components/lifeos'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Toggle } from '@/components/ui/toggle'
import {
  addListLine,
  positionBetween,
  queue,
  removeListLine,
  setMark,
  tickListLines,
  updateItem,
  useFoodSpaces,
  useLiveLists,
  useMarks,
  type ListLine,
  type ListView,
} from '@/data'
import { itemTitle, MARK_LABEL, typeLook } from '@/lib/item-types'
import { deleteItem } from './item-navigation'
import { completeList, untickedLines } from './list-actions'
import { CompleteListDialog, ListDetailsDialog } from './list-dialogs'
import { MoreMenu } from './more-menu'
import { ItemLabels } from './task-details'

const LIST = typeLook('list')

const lastPosition = (lines: readonly ListLine[]) =>
  lines.reduce<string | null>((p, l) => (p === null || l.position > p ? l.position : p), null)

/**
 * A List's lines (NTE-006 3, 4): before its first subheading, then under
 * each, a Card apiece, each ending in a line to add to it; then a line to
 * add a subheading. A ticked line stays in its place.
 */
function Lines({ list, onTick }: { list: ListView; onTick: (id: string, on: boolean) => void }) {
  const id = list.item.id
  const groups: { heading: ListLine | null; lines: ListLine[] }[] = [{ heading: null, lines: [] }]
  for (const l of list.lines) {
    if (l.heading !== null) groups.push({ heading: l, lines: [] })
    else groups.at(-1)!.lines.push(l)
  }
  const addTo = (i: number, text: string) => {
    const g = groups[i]!
    const after = g.lines.at(-1)?.position ?? g.heading?.position ?? null
    const next = groups[i + 1]?.heading?.position ?? null
    addListLine(id, { position: positionBetween(after, next), text })
  }
  // The lines before the first subheading show only when there are some, or no subheadings.
  const shown = groups.filter((g, i) => i > 0 || g.lines.length > 0 || groups.length === 1)
  return (
    <div className="flex max-w-reading flex-col gap-4">
      {shown.map((g) => {
        const i = groups.indexOf(g)
        const label = g.heading?.heading ?? 'Items'
        return (
          <PantryAisle key={g.heading?.id ?? 'top'} label={label} title={g.heading !== null}>
            {g.lines.map((l) => (
              <ShoppingLine
                key={l.id}
                colour={LIST.colour}
                name={l.text ?? ''}
                checked={l.checked}
                onCheck={(on) => onTick(l.id, on)}
                menu={
                  <MoreMenu>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => removeListLine(id, l.id)}
                    >
                      <Trash2Icon /> Delete
                    </DropdownMenuItem>
                  </MoreMenu>
                }
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
          addListLine(id, { position: positionBetween(lastPosition(list.lines), null), heading })
        }
      />
    </div>
  )
}

/**
 * A List's own page (NTE-006, patterns.md#notes): its name with Pin and its
 * "…" menu, who it's for and whether it's done, its Labels, then its lines.
 * Ticking its last line asks whether to complete it; Complete list asks
 * first while lines aren't ticked.
 */
export function ListPage({ list }: { list: ListView }) {
  const navigate = useNavigate()
  const spaces = useFoodSpaces(queue)
  const marks = useMarks(queue)
  const [editing, setEditing] = useState(false)
  const [asking, setAsking] = useState<'ticked' | 'unticked' | null>(null)
  useLiveLists(list.item.id)
  const back = () => void navigate({ to: '/notes', search: { tab: 'lists' } })
  const done = list.item.status === 'done'

  const tick = (lineId: string, on: boolean) => {
    tickListLines(list.item.id, [lineId], on)
    const left = list.toTick.filter((l) => !l.checked && l.id !== lineId)
    if (on && left.length === 0 && !done) setAsking('ticked')
  }
  const complete = () => (untickedLines(list) ? setAsking('unticked') : completeList(list, back))

  const meta = [
    spaces.spaces.length > 1 ? (spaces.householdName(list.item.space_id) ?? 'Personal') : null,
    done ? 'Done' : null,
  ].filter(Boolean)

  return (
    <TypeScope colour={LIST.colour}>
      <PageHeader
        back={{ label: 'Lists', onClick: back }}
        title={itemTitle(list.item)}
        trailing={
          <>
            <Toggle
              aria-label={MARK_LABEL.pinned}
              pressed={marks.has(list.item.id)}
              onPressedChange={(on) => setMark(list.item.id, on)}
            >
              <PinIcon />
            </Toggle>
            <MoreMenu>
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <PencilIcon /> Edit details…
              </DropdownMenuItem>
              {done ? (
                <DropdownMenuItem onClick={() => updateItem(list.item.id, { status: 'active' })}>
                  <CheckIcon /> Not done
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={complete}>
                  <CheckIcon /> Complete list
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
          </>
        }
      />
      <div className="flex flex-col gap-4 px-5 pb-16 sm:px-9 sm:pb-12">
        {meta.length > 0 && (
          <Text as="p" size="sm" tone="muted" className="-mt-3">
            {meta.join(' · ')}
          </Text>
        )}
        <ItemLabels item={list.item} />
        <Lines list={list} onTick={tick} />
      </div>
      {editing && <ListDetailsDialog item={list.item} onClose={() => setEditing(false)} />}
      {asking && (
        <CompleteListDialog
          list={list}
          allTicked={asking === 'ticked'}
          onClose={() => setAsking(null)}
          onDone={back}
        />
      )}
    </TypeScope>
  )
}
