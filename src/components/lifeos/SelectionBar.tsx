import type { LucideIcon } from 'lucide-react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SelectionAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  /** Delete: last, in red. */
  destructive?: boolean
}

/**
 * While choosing several (Ideas, the library): an X that stops choosing and
 * how many are chosen, in the toolbar's place. On a computer the actions
 * follow in the bar as ghost buttons; on a phone they are separate outline
 * buttons sharing the width of a bar fixed to the foot of the screen
 * (Joe, 20 October).
 */
export function SelectionBar({
  count,
  onDone,
  actions,
}: {
  count: number
  onDone: () => void
  actions: SelectionAction[]
}) {
  return (
    <>
      <div
        role="toolbar"
        aria-label="Selection"
        className="flex h-10 items-center gap-1 rounded-control bg-muted pr-1 pl-1"
      >
        <Button variant="ghost" size="icon-sm" aria-label="Stop selecting" onClick={onDone}>
          <XIcon />
        </Button>
        <span className="flex-1 text-sm font-semibold tabular-nums">{count} selected</span>
        <div className="flex items-center gap-1 max-md:hidden">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant={a.destructive ? 'ghost-destructive' : 'ghost'}
              size="sm"
              disabled={count === 0}
              onClick={a.onClick}
            >
              <a.icon /> {a.label}
            </Button>
          ))}
        </div>
      </div>
      <div
        role="toolbar"
        aria-label="Selected"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 grid gap-2 bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-dialog md:hidden',
          actions.length === 1
            ? 'grid-cols-1'
            : actions.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-3',
        )}
      >
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            disabled={count === 0}
            className={cn('w-full', a.destructive && 'text-destructive')}
            onClick={a.onClick}
          >
            <a.icon /> {a.label}
          </Button>
        ))}
      </div>
    </>
  )
}
