import { PlusIcon, SearchIcon } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TYPE_ICONS } from './colours'
import { TypeTile } from './TypeTile'

/**
 * Linking a Task to an Event (EVT-006, components.md): a Popover to find one
 * of my open Tasks, or, with a title typed that no Task has, make it there
 * and then. Choosing one links it *for* the Event and closes.
 */
export function TaskLinker({
  trigger,
  tasks,
  onLink,
  onCreate,
  open,
  initialQuery = '',
}: {
  trigger: ReactElement
  /** My open Tasks not linked to it yet, soonest first. */
  tasks: { id: string; title: string; when?: string }[]
  onLink: (id: string) => void
  /** Makes the Task and links it. */
  onCreate: (title: string) => void
  open?: boolean
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const q = query.trim().toLocaleLowerCase()
  const shown = tasks.filter((t) => t.title.toLocaleLowerCase().includes(q))
  const canCreate = q !== '' && !tasks.some((t) => t.title.toLocaleLowerCase() === q)
  const TaskIcon = TYPE_ICONS.task!
  return (
    <Popover open={open} onOpenChange={(o) => !o && setQuery('')}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-80 gap-1.5 p-1.5">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            size="sm"
            className="pl-8"
            aria-label="Find or make a task"
            placeholder="Find or make a task"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="max-h-72">
          <div role="group" aria-label="Tasks" className="flex flex-col">
            {canCreate && (
              <button
                type="button"
                onClick={() => onCreate(query.trim())}
                className="flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-left text-base outline-none hover:bg-accent focus-visible:bg-accent [&>svg]:size-4 [&>svg]:text-muted-foreground"
              >
                <PlusIcon /> New task "{query.trim()}"
              </button>
            )}
            {shown.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onLink(t.id)}
                className="flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-left text-base outline-none hover:bg-accent focus-visible:bg-accent"
              >
                <TypeTile colour="blue" icon={TaskIcon} size="sm" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {t.when && (
                  <span className="text-sm text-muted-foreground tabular-nums">{t.when}</span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
