import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightbulbIcon, ListChecksIcon, StickyNoteIcon, TagIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EmptyState,
  LabelChips,
  NoteCard,
  NoteGrid,
  PageAction,
  PageHeader,
  SectionLabel,
  TabsRow,
  TypeScope,
} from '@/components/lifeos'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNewNote, useOpenItem } from '@/app/item-navigation'
import { useLabelFilter, validateLabels, type LabelsSearch } from '@/app/label-filter'
import { useMine } from '@/app/mine'
import { useOpenCapture } from '@/app/open-capture'
import { NewListDialog } from '@/app/list-dialogs'
import { ThoughtRow } from '@/app/thought-row'
import { queue, useItems, useLabels, useLists, useLiveLists, useMarks, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

type Tab = 'notes' | 'thoughts' | 'lists'

/**
 * My Notes, pinned first, my Thoughts to sort and my Lists, narrowed to the
 * Labels I choose (views/notes.md).
 */
export const Route = createFileRoute('/_app/notes')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: 'thoughts' | 'lists' } & LabelsSearch => ({
    ...(search.tab === 'thoughts' || search.tab === 'lists' ? { tab: search.tab } : {}),
    ...validateLabels(search),
  }),
  component: Notes,
})

/** A List's lines to show on its card: its first unticked ones (NTE-007 2). */
const LIST_CARD_LINES = 8

const newestFirst = (a: Item, b: Item) => b.updated_at.localeCompare(a.updated_at)

function Notes() {
  const search = Route.useSearch()
  const tab: Tab = search.tab ?? 'notes'
  const navigate = useNavigate()
  const openCapture = useOpenCapture()
  const mine = useMine()
  const filter = useLabelFilter(search.labels)
  const open = useOpenItem()
  const newNote = useNewNote()
  const { items, isLoading } = useItems(queue)
  const marks = useMarks(queue)
  const { labels, itemLabels } = useLabels(queue)
  const lists = useLists(queue)
  const [makingList, setMakingList] = useState(false)

  const notes = useMemo(() => items.filter((i) => i.type === 'note'), [items])
  const labelsOf = useMemo(() => {
    const names = new Map(labels.map((l) => [l.id, l.name]))
    const of = new Map<string, { id: string; name: string }[]>()
    for (const r of itemLabels) {
      const name = names.get(r.label_id)
      if (name === undefined) continue
      of.set(r.item_id, [...(of.get(r.item_id) ?? []), { id: r.label_id, name }])
    }
    for (const list of of.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return of
  }, [labels, itemLabels])

  // Thoughts not ticked off, newest first (NTE-005 2).
  const thoughts = useMemo(
    () =>
      items
        .filter((i) => i.type === 'thought' && i.archived_at === null && i.status === 'active')
        .filter(mine)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [items, mine],
  )
  const now = new Date()
  const shownThoughts = thoughts.filter((t) => filter.shows(t.id))
  const shown = notes.filter((n) => filter.shows(n.id))
  const pinned = shown.filter((n) => marks.has(n.id)).sort(newestFirst)
  const others = shown.filter((n) => !marks.has(n.id)).sort(newestFirst)

  // My Lists not done, the most recently changed first, a line's change too (NTE-007 1).
  const openLists = lists.lists
    .filter((l) => l.item.status === 'active' && l.item.archived_at === null && mine(l.item))
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
  const shownLists = openLists.filter((l) => filter.shows(l.item.id))
  const listsPinned = shownLists.filter((l) => marks.has(l.item.id))
  const listsOthers = shownLists.filter((l) => !marks.has(l.item.id))
  const checklistOf = useMemo(() => {
    const of = new Map<string, string[]>()
    for (const l of lists.lists)
      of.set(
        l.item.id,
        l.toTick
          .filter((line) => !line.checked)
          .slice(0, LIST_CARD_LINES)
          .map((line) => line.text ?? ''),
      )
    return of
  }, [lists.lists])

  const grid = (list: Item[]) => (
    <NoteGrid>
      {list.map((n) => (
        <NoteCard
          key={n.id}
          title={itemTitle(n)}
          body={n.body}
          checklist={n.type === 'list' ? (checklistOf.get(n.id) ?? []) : undefined}
          labels={(labelsOf.get(n.id) ?? []).map((l) => l.name)}
          onOpen={() => open(n)}
        />
      ))}
    </NoteGrid>
  )
  /** Pinned, then Others, each a grid; with nothing pinned, no headings (NTE-003). */
  const sections = (pins: Item[], rest: Item[]) => (
    <>
      {pins.length > 0 && (
        <section>
          <SectionLabel>Pinned</SectionLabel>
          {grid(pins)}
        </section>
      )}
      {rest.length > 0 &&
        (pins.length > 0 ? (
          <section>
            <SectionLabel>Others</SectionLabel>
            {grid(rest)}
          </section>
        ) : (
          grid(rest)
        ))}
    </>
  )

  // Each tab's main action: New note, New thought, which opens "New"
  // (NTE-005 4), or New list (NTE-007 1).
  const action =
    tab === 'notes'
      ? { label: 'New note', onClick: newNote }
      : tab === 'lists'
        ? { label: 'New list', onClick: () => setMakingList(true) }
        : { label: 'New thought', onClick: () => openCapture() }

  return (
    <TypeScope colour="yellow">
      <PageHeader title="Notes" action={action} />
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <div className="flex flex-col gap-3">
          <TabsRow>
            <Tabs
              value={tab}
              onValueChange={(value: Tab) =>
                void navigate({
                  to: '.',
                  search: (prev) => ({ ...prev, tab: value === 'notes' ? undefined : value }),
                  replace: true,
                })
              }
            >
              <TabsList aria-label="View">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="thoughts">Thoughts</TabsTrigger>
                <TabsTrigger value="lists">Lists</TabsTrigger>
              </TabsList>
            </Tabs>
            <PageAction label={action.label} onClick={action.onClick} />
          </TabsRow>
          {filter.labels.length > 0 && (
            <LabelChips labels={filter.labels} chosen={filter.chosen} onChange={filter.choose} />
          )}
        </div>
        {tab === 'notes' ? (
          <>
            {!isLoading && notes.length === 0 && (
              <EmptyState icon={StickyNoteIcon} title="No notes yet" action={action} />
            )}
            {notes.length > 0 && shown.length === 0 && (
              <EmptyState icon={TagIcon} title={filter.nothing('notes')} />
            )}
            {sections(pinned, others)}
          </>
        ) : tab === 'lists' ? (
          <>
            <LiveLists />
            {!lists.isLoading && openLists.length === 0 && (
              <EmptyState icon={ListChecksIcon} title="No lists yet" action={action} />
            )}
            {openLists.length > 0 && shownLists.length === 0 && (
              <EmptyState icon={TagIcon} title={filter.nothing('lists')} />
            )}
            {sections(
              listsPinned.map((l) => l.item),
              listsOthers.map((l) => l.item),
            )}
          </>
        ) : (
          <>
            {!isLoading && thoughts.length === 0 && (
              <EmptyState icon={LightbulbIcon} title="No thoughts to sort" action={action} />
            )}
            {thoughts.length > 0 && shownThoughts.length === 0 && (
              <EmptyState icon={TagIcon} title={filter.nothing('thoughts')} />
            )}
            <div className="flex max-w-reading flex-col gap-1.5">
              {shownThoughts.map((t) => (
                <ThoughtRow
                  key={t.id}
                  thought={t}
                  now={now}
                  labels={(labelsOf.get(t.id) ?? []).map((l) => l.name)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {makingList && <NewListDialog onClose={() => setMakingList(false)} />}
    </TypeScope>
  )
}

/** Shared Lists' lines kept live while the tab is open (NTE-008 2). */
function LiveLists() {
  useLiveLists()
  return null
}
