import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { StickyNoteIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  EmptyState,
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
import { queue, useItems, useLabels, useMarks, type Item } from '@/data'
import { itemTitle } from '@/lib/item-types'

/** My Notes, pinned first, narrowed to a Label if I choose one (views/notes.md). */
export const Route = createFileRoute('/_app/notes')({
  validateSearch: (search: Record<string, unknown>): { label?: string } =>
    typeof search.label === 'string' ? { label: search.label } : {},
  component: Notes,
})

const newestFirst = (a: Item, b: Item) => b.updated_at.localeCompare(a.updated_at)

function Notes() {
  const { label } = Route.useSearch()
  const navigate = useNavigate()
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

  // The Labels my Notes have, A to Z, as the page's tabs.
  const tabs = useMemo(() => {
    const used = new Map<string, string>()
    for (const n of notes) for (const l of labelsOf.get(n.id) ?? []) used.set(l.id, l.name)
    return [...used]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [notes, labelsOf])
  const current = tabs.some((t) => t.id === label) ? label : undefined

  const shown = notes.filter(
    (n) => !current || (labelsOf.get(n.id) ?? []).some((l) => l.id === current),
  )
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
        <TabsRow className={tabs.length === 0 ? 'max-md:hidden' : undefined}>
          {tabs.length > 0 && (
            <Tabs
              value={current ?? 'all'}
              onValueChange={(value: string) =>
                void navigate({
                  to: '.',
                  search: (prev) => ({ ...prev, label: value === 'all' ? undefined : value }),
                  replace: true,
                })
              }
            >
              <TabsList aria-label="Label">
                <TabsTrigger value="all">All</TabsTrigger>
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <PageAction label="New note" onClick={newNote} />
        </TabsRow>
        {!isLoading && notes.length === 0 && (
          <EmptyState icon={StickyNoteIcon} title="No notes yet" />
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
