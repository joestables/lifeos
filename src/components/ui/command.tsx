import { SearchIcon } from 'lucide-react'
import { useId, useState, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from './dialog'
import { menuLabelClasses } from './menu-classes'
import { ScrollArea } from './scroll-area'
import { Separator } from './separator'

export interface CommandItem {
  id: string
  /** Its name, as a screen reader says it. */
  label: string
  /** A small TypeTile. */
  leading?: ReactNode
  /** The title, the match in bold. */
  title: ReactNode
  /** The muted line under it. */
  line?: ReactNode
}

export interface CommandGroup {
  label: string
  items: CommandItem[]
}

/**
 * Command (components.md): a 48px input with a search icon, then results
 * grouped under 12px muted labels, each a 52px item; the highlighted one
 * `--accent`, moved with the arrow keys and chosen with Enter. In a Dialog
 * (`dialog`) the input sits bare over a line; on a page (`page`) it is filled.
 */
export function Command({
  label,
  value,
  onValueChange,
  groups,
  onChoose,
  status,
  variant = 'dialog',
  inputRef,
}: {
  /** What it searches: the input's and the list's name. */
  label: string
  value: string
  onValueChange: (value: string) => void
  groups: CommandGroup[]
  onChoose: (id: string) => void
  /** A muted line over the results: "Nothing found", offline. */
  status?: ReactNode
  variant?: 'dialog' | 'page'
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const ids = useId()
  const flat = groups.flatMap((g) => g.items)
  const [active, setActive] = useState<string | null>(null)
  // The highlight stays on its item while results change, else the first.
  const current = flat.find((i) => i.id === active)?.id ?? flat[0]?.id
  const optionId = (id: string) => `${ids}-${id}`

  const move = (by: number) => {
    if (flat.length === 0) return
    const at = flat.findIndex((i) => i.id === current)
    const next = flat[(at + by + flat.length) % flat.length]!
    setActive(next.id)
    document.getElementById(optionId(next.id))?.scrollIntoView({ block: 'nearest' })
  }

  const input = (
    <input
      ref={inputRef}
      role="combobox"
      aria-label={label}
      aria-expanded={flat.length > 0}
      aria-controls={`${ids}-list`}
      aria-autocomplete="list"
      aria-activedescendant={current ? optionId(current) : undefined}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="search"
      type="search"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(e.key === 'ArrowDown' ? 1 : -1)
        } else if (e.key === 'Enter' && current) {
          e.preventDefault()
          onChoose(current)
        }
      }}
      className={cn(
        'h-12 w-full min-w-0 text-[16px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden',
        variant === 'dialog'
          ? 'bg-transparent pr-4 pl-12'
          : 'rounded-control bg-input pr-3.5 pl-11 transition-[background-color,box-shadow] focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring-soft',
      )}
    />
  )

  const list = (
    <div
      id={`${ids}-list`}
      role="listbox"
      aria-label={label}
      className={cn('flex flex-col', variant === 'dialog' ? 'p-1.5' : 'gap-1')}
    >
      {groups.map((g, n) => (
        <div
          key={g.label}
          role="group"
          aria-labelledby={`${ids}-g${n}`}
          className="flex flex-col not-first:mt-1"
        >
          <div id={`${ids}-g${n}`} className={menuLabelClasses}>
            {g.label}
          </div>
          {g.items.map((item) => (
            <div
              key={item.id}
              id={optionId(item.id)}
              role="option"
              aria-label={item.label}
              aria-selected={item.id === current}
              data-highlighted={item.id === current ? '' : undefined}
              onMouseMove={() => item.id !== current && setActive(item.id)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChoose(item.id)}
              className="flex h-13 cursor-pointer items-center gap-3 rounded-sm px-2.5 select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              {item.leading}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate [&_strong]:font-bold">{item.title}</span>
                {item.line && (
                  <span className="truncate text-xs text-muted-foreground [&_strong]:font-bold [&_strong]:text-foreground">
                    {item.line}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  const statusLine = status && (
    <div
      role="status"
      className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground [&_svg]:size-4"
    >
      {status}
    </div>
  )
  const icon = (
    <SearchIcon
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground',
        variant === 'dialog' ? 'left-4' : 'left-3.5',
      )}
    />
  )

  if (variant === 'page')
    return (
      <div data-slot="command" className="flex flex-col gap-3">
        <div className="relative">
          {icon}
          {input}
        </div>
        {statusLine}
        {list}
      </div>
    )

  return (
    <div data-slot="command" className="flex min-h-0 flex-col">
      <div className="relative shrink-0">
        {icon}
        {input}
      </div>
      {(flat.length > 0 || statusLine) && <Separator />}
      {statusLine}
      {flat.length > 0 && <ScrollArea className="max-h-[min(60svh,30rem)]">{list}</ScrollArea>}
    </div>
  )
}

/** Command in a Dialog near the top (components.md): Search on a computer. */
export function CommandDialog({
  open,
  onOpenChange,
  title,
  initialFocus,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Its name, for a screen reader. */
  title: string
  initialFocus?: RefObject<HTMLInputElement | null>
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={initialFocus}
        className="top-[76px] max-w-[560px] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12svh]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}
