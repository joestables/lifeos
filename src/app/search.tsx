import { useNavigate } from '@tanstack/react-router'
import { CloudOffIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TypeTile } from '@/components/lifeos'
import { Command, CommandDialog, type CommandGroup } from '@/components/ui/command'
import { queue, useLabels, type Item } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { itemTitle, typeLook } from '@/lib/item-types'
import { byType, markMatches, resultLine, type Marked } from '@/lib/search'
import { OpenSearch } from './open-search'
import { useSearch } from './use-search'
import { useOpenItem } from './item-navigation'

const bold = (parts: Marked[]) =>
  parts.map((p, i) => (p.match ? <strong key={i}>{p.text}</strong> : p.text))

/** Command's groups for a search's results: by Type, each with its tile and line. */
function useResultGroups(results: Item[], words: string[]): CommandGroup[] {
  const { labels, itemLabels } = useLabels(queue)
  return useMemo(() => {
    const now = new Date()
    const names = new Map(labels.map((l) => [l.id, l.name]))
    const labelsOf = (id: string) =>
      itemLabels
        .filter((r) => r.item_id === id)
        .map((r) => names.get(r.label_id))
        .filter((n): n is string => n !== undefined)
        .sort((a, b) => a.localeCompare(b))
    return byType(results).map(({ type, items }) => {
      const look = typeLook(type)
      return {
        label: `${look.label}s`,
        items: items.map((item) => {
          const title = itemTitle(item)
          const line = resultLine(item, words, labelsOf(item.id), now)
          return {
            id: item.id,
            label: title,
            leading: <TypeTile size="sm" colour={look.colour} icon={look.icon} />,
            title: bold(markMatches(title, words)),
            line: line && (
              <span className={line.danger ? 'text-destructive' : undefined}>
                {bold(markMatches(line.text, words))}
              </span>
            ),
          }
        }),
      }
    })
  }, [results, words, labels, itemLabels])
}

/**
 * Search (SRC-001, SRC-002): Command over the results as they come, offline
 * from the device, a result opened where its Type opens.
 */
export function SearchCommand({
  query,
  onQueryChange,
  onChosen,
  variant,
  inputRef,
}: {
  query: string
  onQueryChange: (query: string) => void
  /** Before the chosen Item opens: the dialog closes. */
  onChosen?: () => void
  variant: 'dialog' | 'page'
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const open = useOpenItem()
  const { results, words, onDevice, done } = useSearch(query)
  const groups = useResultGroups(results, words)
  const status = onDevice ? (
    <>
      <CloudOffIcon aria-hidden />
      {onDevice === 'offline' ? 'Offline' : "Can't reach LifeOS"} · Results may be incomplete
    </>
  ) : done && words.length > 0 && results.length === 0 ? (
    'Nothing found'
  ) : undefined
  return (
    <Command
      label="Search"
      value={query}
      onValueChange={onQueryChange}
      groups={groups}
      status={status}
      variant={variant}
      inputRef={inputRef}
      onChoose={(id) => {
        const item = results.find((i) => i.id === id)
        if (!item) return
        onChosen?.()
        open(item)
      }}
    />
  )
}

/** Search over any page on a computer, with / (SRC-001 1). */
export function SearchProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  // Read by the / key without re-adding its listener.
  const isOpen = useRef(false)
  useEffect(() => {
    isOpen.current = open
  }, [open])

  const start = useCallback(() => {
    if (isMobile) {
      void navigate({ to: '/search' })
      return
    }
    setQuery('')
    setOpen(true)
  }, [isMobile, navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.repeat || isOpen.current) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setQuery('')
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <OpenSearch.Provider value={start}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" initialFocus={input}>
        <SearchCommand
          variant="dialog"
          query={query}
          onQueryChange={setQuery}
          inputRef={input}
          onChosen={() => setOpen(false)}
        />
      </CommandDialog>
    </OpenSearch.Provider>
  )
}
