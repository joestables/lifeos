import { Children, isValidElement, useCallback, useEffect, useState } from 'react'
import type * as React from 'react'
import { CheckIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { previewLines, type Inline } from '@/lib/markdown-preview'
import { cn } from '@/lib/utils'

function Runs({ runs }: { runs: Inline[] }) {
  return runs.map((r, i) => (
    <span key={i} className={cn(r.bold && 'font-semibold', r.italic && 'italic')}>
      {r.text}
    </span>
  ))
}

/**
 * A Note on the Notes page (components.md): its title, the start of its
 * body as it reads, and its Labels. The whole card opens the Note.
 */
export function NoteCard({
  title,
  body,
  labels = [],
  onOpen,
}: {
  title: string
  /** Markdown (ADR-0046). */
  body: string | null
  labels?: string[]
  onOpen: () => void
}) {
  // Without a title the first line stands in, so it isn't shown twice.
  const lines = previewLines(body, 9)
  const shown =
    lines.length &&
    title ===
      lines[0]!.text
        .map((t) => t.text)
        .join('')
        .trim()
  return (
    <button
      type="button"
      data-slot="note-card"
      aria-label={title}
      onClick={onOpen}
      className="flex min-w-0 flex-col gap-2 rounded-lg bg-card p-3.5 text-left shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring-soft sm:p-4"
    >
      <span className="font-bold break-words">{title}</span>
      {lines.length > (shown ? 1 : 0) && (
        <span className="flex flex-col gap-[3px] text-sm leading-[1.5] break-words text-muted-foreground">
          {lines.slice(shown ? 1 : 0, shown ? 9 : 8).map((line, i) => (
            <span key={i} className="flex items-start gap-2">
              {line.kind === 'check' && (
                <span
                  aria-hidden
                  className={cn(
                    'mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-xs border-[1.5px] border-input-strong',
                    line.done && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {line.done && <CheckIcon className="size-2.5" strokeWidth={3} />}
                </span>
              )}
              {line.kind === 'bullet' && <span aria-hidden>•</span>}
              {line.kind === 'number' && <span className="tabular-nums">{line.n}.</span>}
              <span className={cn('min-w-0', line.kind === 'check' && line.done && 'line-through')}>
                <Runs runs={line.text} />
              </span>
            </span>
          ))}
        </span>
      )}
      {labels.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {labels.map((l) => (
            <Badge key={l} variant="outline">
              {l}
            </Badge>
          ))}
        </span>
      )}
    </button>
  )
}

/** The narrowest a column of NoteCards gets on a computer, and the gap between them. */
const MIN_COLUMN = 200
const GAP = 14

/**
 * NoteCards as a masonry (components.md, like Keep): as many columns as fit
 * at 200px or more (2 on a phone), each card going under the shortest
 * column so far, so cards of different heights fit together with no gaps.
 * In reading order, near enough: left to right, then down.
 */
export function NoteGrid({ children }: { children: React.ReactNode }) {
  const cards = Children.toArray(children).filter(isValidElement)
  const [columns, setColumns] = useState(2)
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(new Map())
  const [observer] = useState(() =>
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) =>
          setHeights((prev) => {
            let next: Map<string, number> | null = null
            for (const e of entries) {
              const key = (e.target as HTMLElement).dataset.card!
              const h = e.borderBoxSize[0]?.blockSize ?? e.target.getBoundingClientRect().height
              if (prev.get(key) !== h) (next ??= new Map(prev)).set(key, h)
            }
            return next ?? prev
          }),
        ),
  )
  useEffect(() => () => observer?.disconnect(), [observer])

  // The grid's width decides how many columns fit.
  const grid = useCallback((el: HTMLDivElement | null) => {
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => {
      const width = e!.contentRect.width
      setColumns(Math.max(2, Math.floor((width + GAP) / (MIN_COLUMN + GAP))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const card = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !observer) return
      observer.observe(el)
      return () => observer.unobserve(el)
    },
    [observer],
  )

  const placed: React.ReactElement[][] = Array.from({ length: columns }, () => [])
  const filled = Array<number>(columns).fill(0)
  for (const c of cards) {
    const key = String(c.key)
    const shortest = filled.indexOf(Math.min(...filled))
    placed[shortest]!.push(
      <div key={key} data-card={key} ref={card} className="flex flex-col">
        {c}
      </div>,
    )
    // Until it is measured, a card counts as one row, so they go round in turn.
    filled[shortest]! += (heights.get(key) ?? 1) + GAP
  }

  return (
    <div ref={grid} className="flex items-start gap-2.5 sm:gap-3.5">
      {placed.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3.5">
          {column}
        </div>
      ))}
    </div>
  )
}
