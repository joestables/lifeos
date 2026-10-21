import type { ReactElement, ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface Suggestion {
  key: string
  label: string
  /** Muted, at the end: a Pantry entry's aisle. */
  meta?: string
  icon?: ReactNode
}

/** The typed part of a name in bold. */
function Matched({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.trim().toLowerCase()) : -1
  if (at < 0) return <>{text}</>
  const end = at + query.trim().length
  return (
    <>
      {text.slice(0, at)}
      <b>{text.slice(at, end)}</b>
      {text.slice(end)}
    </>
  )
}

const ROW =
  'flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none hover:bg-accent [&_svg]:size-4'

/**
 * Suggestions under a field as it is typed (components.md: the Pantry's for
 * an ingredient, 320px; my Recipes for an "@", 280px): an optional muted
 * title, the matches with the typed part bold, the highlighted one
 * `--accent`, then actions after a line. Focus stays in the field; the
 * field moves the highlight with the arrow keys and chooses with Enter.
 */
export function Suggestions({
  open,
  onDismiss,
  field,
  title,
  query,
  items,
  active,
  onChoose,
  actions = [],
  width = 'md',
}: {
  open: boolean
  onDismiss: () => void
  /** The field typed into. */
  field: ReactElement
  title?: string
  query: string
  items: Suggestion[]
  /** The highlighted match's index. */
  active: number
  onChoose: (key: string) => void
  actions?: { key: string; label: ReactNode; icon?: ReactNode; onClick: () => void }[]
  width?: 'sm' | 'md'
}) {
  // Choosing never takes focus from the field.
  const keep = (e: { preventDefault: () => void }) => e.preventDefault()
  return (
    <Popover open={open} onOpenChange={(next) => !next && onDismiss()}>
      <PopoverTrigger
        nativeButton={false}
        openOnHover={false}
        render={<div className="min-w-0 flex-1" />}
      >
        {field}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        initialFocus={false}
        finalFocus={false}
        className={cn('gap-0 p-1.5', width === 'md' ? 'w-[320px]' : 'w-[280px]')}
      >
        {title && items.length > 0 && (
          <div className="px-2 pt-1 pb-1.5 text-xs font-semibold text-muted-foreground">
            {title}
          </div>
        )}
        <div role="listbox" aria-label={title ?? 'Suggestions'} className="flex flex-col">
          {items.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={keep}
              onClick={() => onChoose(s.key)}
              className={cn(ROW, 'justify-between', i === active && 'bg-accent')}
            >
              <span className="flex min-w-0 items-center gap-2">
                {s.icon}
                <span className="truncate">
                  <Matched text={s.label} query={query} />
                </span>
              </span>
              {s.meta && <span className="shrink-0 text-xs text-muted-foreground">{s.meta}</span>}
            </button>
          ))}
        </div>
        {actions.length > 0 && (
          <>
            {items.length > 0 && <div className="my-1 h-px bg-border" />}
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                onMouseDown={keep}
                onClick={a.onClick}
                className={ROW}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
