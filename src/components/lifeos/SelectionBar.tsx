import { XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * While choosing several (Ideas, the library): how many are chosen, the
 * actions for them as ghost buttons, and an X that stops choosing. It takes
 * the place of the toolbar it was opened from.
 */
export function SelectionBar({
  count,
  onDone,
  children,
}: {
  count: number
  onDone: () => void
  /** The actions: ghost buttons, Delete last and destructive. */
  children: ReactNode
}) {
  return (
    <div
      role="toolbar"
      aria-label="Selection"
      className="flex h-10 items-center gap-1 rounded-control bg-muted pr-1 pl-3"
    >
      <span className="flex-1 text-sm font-semibold tabular-nums">{count} selected</span>
      {children}
      <Button variant="ghost" size="icon-sm" aria-label="Stop selecting" onClick={onDone}>
        <XIcon />
      </Button>
    </div>
  )
}
