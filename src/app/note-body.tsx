import { TagIcon } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LabelPicker } from '@/components/lifeos/LabelPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  addLabel,
  createItem,
  createLabel,
  queue,
  removeLabel,
  updateItem,
  useLabels,
  type Item,
  type ItemFields,
} from '@/data'

// The editor is only loaded when a Note opens (ADR-0046).
const NoteEditor = lazy(() => import('@/components/lifeos/note/NoteEditor'))

/** How long typing pauses before it is kept. */
const PAUSE = 400

/**
 * A Note, written in place (NTE-001): kept as it is typed, with nothing to
 * save, offline too. A new one is made by its first change, so one closed
 * untouched leaves nothing behind. Its Labels are under it (NTE-002).
 */
export function NoteBody({ item, draft }: { item: Item; draft: boolean }) {
  const [title, setTitle] = useState(item.title)
  const kept = useRef(!draft)
  const waiting = useRef<ItemFields>({})
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const patch = waiting.current
    waiting.current = {}
    if (Object.keys(patch).length === 0) return
    if (kept.current) updateItem(item.id, patch)
    else {
      createItem('note', patch, item.id)
      kept.current = true
    }
  }, [item.id])

  /** Makes a new Note now, for a Label to go on. */
  const keep = () => {
    if (kept.current) return flush()
    waiting.current = { title, ...waiting.current }
    flush()
  }

  const change = (patch: ItemFields) => {
    Object.assign(waiting.current, patch)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, PAUSE)
  }

  // Closing, leaving the page or the app keeps what was typed.
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const { labels, itemLabels } = useLabels(queue)
  const chosen = useMemo(
    () => new Set(itemLabels.filter((r) => r.item_id === item.id).map((r) => r.label_id)),
    [itemLabels, item.id],
  )
  const byName = useMemo(() => [...labels].sort((a, b) => a.name.localeCompare(b.name)), [labels])

  return (
    <Suspense fallback={<div className="h-32" />}>
      <NoteEditor
        title={title}
        body={item.body ?? ''}
        autoFocusTitle={draft}
        onTitleChange={(t) => {
          setTitle(t)
          change({ title: t })
        }}
        onBodyChange={(body) => change({ body })}
        footer={
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {byName
              .filter((l) => chosen.has(l.id))
              .map((l) => (
                <Badge key={l.id}>{l.name}</Badge>
              ))}
            <LabelPicker
              trigger={
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <TagIcon /> Label
                </Button>
              }
              labels={byName}
              chosen={chosen}
              onToggle={(id, on) => {
                keep()
                if (on) addLabel(item.id, id)
                else removeLabel(item.id, id)
              }}
              onCreate={(name) => {
                keep()
                addLabel(item.id, createLabel(name))
              }}
            />
          </div>
        }
      />
    </Suspense>
  )
}
