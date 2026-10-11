import { PlusIcon, SearchIcon, TagIcon } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

/**
 * Giving an Item its Labels (components.md, ITM-005): filter or name one,
 * tick to add or take off at once, or make a new one.
 */
export function LabelPicker({
  trigger,
  labels,
  chosen,
  onToggle,
  onCreate,
}: {
  trigger: ReactElement
  /** Mine, A to Z. */
  labels: { id: string; name: string }[]
  chosen: ReadonlySet<string>
  onToggle: (id: string, on: boolean) => void
  /** Makes the Label and gives it to the Item. */
  onCreate: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const shown = labels.filter((l) =>
    l.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const canCreate = query.trim() !== '' && !labels.some((l) => same(l.name, query))
  const create = () => {
    onCreate(query.trim())
    setQuery('')
  }

  return (
    <Popover onOpenChange={(open) => !open && setQuery('')}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-64 gap-1.5 p-1.5">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            size="sm"
            className="pl-8"
            aria-label="Label"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreate) {
                e.preventDefault()
                create()
              }
            }}
          />
        </div>
        <ScrollArea className="max-h-64">
          <div role="group" aria-label="Labels" className="flex flex-col">
            {canCreate && (
              <button
                type="button"
                onClick={create}
                className="flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-left text-base outline-none hover:bg-accent focus-visible:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
              >
                <PlusIcon /> Create "{query.trim()}"
              </button>
            )}
            {shown.map((l) => (
              <label
                key={l.id}
                className="flex h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-base hover:bg-accent has-focus-visible:bg-accent"
              >
                <Checkbox checked={chosen.has(l.id)} onCheckedChange={(on) => onToggle(l.id, on)} />
                <span className="truncate">{l.name}</span>
              </label>
            ))}
            {shown.length === 0 && !canCreate && (
              <span className="flex h-9 items-center gap-2.5 px-2.5 text-sm text-muted-foreground [&_svg]:size-4">
                <TagIcon /> No labels yet
              </span>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
