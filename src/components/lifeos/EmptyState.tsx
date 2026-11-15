import { PlusIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { TypeTile } from './TypeTile'

/**
 * A page with nothing to show (patterns.md#states): centred, about a third of
 * the way down, a large muted tile with the page's icon and one line; then,
 * on a computer, the page's own main action as an outline button, so the way
 * forward is where the eye is (Joe, 15 November). A phone has its Fab.
 */
export function EmptyState({
  icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  /** The page's main action ("New note"). */
  action?: { label: string; onClick: () => void }
  /** In the action's place, where it isn't a plain button (Today's "+" menu). */
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 pt-[18vh]">
      <TypeTile colour="none" icon={icon} size="lg" />
      <h2 className="text-h2">{title}</h2>
      {(action || children) && (
        <div className="hidden md:flex">
          {children ?? (
            <Button variant="outline" size="sm" onClick={action!.onClick}>
              <PlusIcon /> {action!.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
