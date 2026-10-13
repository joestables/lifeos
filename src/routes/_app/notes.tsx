import { createFileRoute } from '@tanstack/react-router'
import { StickyNoteIcon, TagIcon } from 'lucide-react'
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
import { useNewNote, useOpenItem } from '@/app/item-navigation'
import { useLabelFilter, validateLabels } from '@/app/label-filter'
import { queue, useItems, useLabels, useMarks, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

/** My Notes, pinned first, narrowed to the Labels I choose (views/notes.md). */
export const Route = createFileRoute('/_app/notes')({
  validateSearch: validateLabels,
  component: Notes,
})

const newestFirst = (a: Item, b: Item) => b.updated_at.localeCompare(a.updated_at)

function Notes() {
  const search = Route.useSearch()
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

  return (
    <TypeScope colour="yellow">
      <PageHeader title="Notes" action={{ label: 'New note', onClick: newNote }} />
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        {/* Nothing in it on a phone without Labels, where the Fab is New note. */}
        <TabsRow className={filter.labels.length === 0 ? 'max-md:hidden' : undefined}>
          {filter.labels.length > 0 && (
            <LabelChips labels={filter.labels} chosen={filter.chosen} onChange={filter.choose} />
          )}
          <PageAction label="New note" onClick={newNote} />
        </TabsRow>
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
      </div>
    </TypeScope>
  )
}
