import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightbulbIcon, StickyNoteIcon, TagIcon } from 'lucide-react'
import { useMemo } from 'react'
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
import { ThoughtRow } from '@/app/thought-row'
import { queue, useItems, useLabels, useMarks, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

type Tab = 'notes' | 'thoughts'

/** My Notes, pinned first, and my Thoughts to sort, narrowed to the Labels I choose (views/notes.md). */
export const Route = createFileRoute('/_app/notes')({
  validateSearch: (search: Record<string, unknown>): { tab?: 'thoughts' } & LabelsSearch => ({
    ...(search.tab === 'thoughts' ? { tab: 'thoughts' as const } : {}),
    ...validateLabels(search),
  }),
  component: Notes,
})

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

  const grid = (list: Item[]) => (
    <NoteGrid>
      {list.map((n) => (
        <NoteCard
          key={n.id}
          title={itemTitle(n)}
          body={n.body}
          labels={(labelsOf.get(n.id) ?? []).map((l) => l.name)}
          onOpen={() => open(n)}
        />
      ))}
    </NoteGrid>
  )

  // Each tab's main action: New note, or New thought, which opens "New" (NTE-005 4).
  const action =
    tab === 'notes'
      ? { label: 'New note', onClick: newNote }
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
              <EmptyState icon={StickyNoteIcon} title="No notes yet" />
            )}
            {notes.length > 0 && shown.length === 0 && (
              <EmptyState icon={TagIcon} title={filter.nothing('notes')} />
            )}
            {pinned.length > 0 && (
              <section>
                <SectionLabel>Pinned</SectionLabel>
                {grid(pinned)}
              </section>
            )}
            {others.length > 0 &&
              (pinned.length > 0 ? (
                <section>
                  <SectionLabel>Others</SectionLabel>
                  {grid(others)}
                </section>
              ) : (
                grid(others)
              ))}
          </>
        ) : (
          <>
            {!isLoading && thoughts.length === 0 && (
              <EmptyState icon={LightbulbIcon} title="No thoughts to sort" />
            )}
            {thoughts.length > 0 && shownThoughts.length === 0 && (
              <EmptyState icon={TagIcon} title={filter.nothing('thoughts')} />
            )}
            <div className="flex max-w-3xl flex-col gap-1.5">
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
    </TypeScope>
  )
}
