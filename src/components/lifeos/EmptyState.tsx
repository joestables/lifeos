import type { LucideIcon } from 'lucide-react'
import { TypeTile } from './TypeTile'

/**
 * A page with nothing to show (patterns.md#states): centred, about a third of
 * the way down, a large muted tile with the page's icon and one line.
 */
export function EmptyState({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 pt-[18vh]">
      <TypeTile colour="none" icon={icon} size="lg" />
      <h2 className="text-h2">{title}</h2>
    </div>
  )
}
