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

/** NoteCards in a grid: 4 columns on a computer (each at least 200px), 2 on a phone. */
export function NoteGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-start gap-2.5 sm:gap-3.5 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
      {children}
    </div>
  )
}
