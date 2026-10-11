import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/** The first thing in a row that shows an Item: its Type's icon on its colour's tint. */
export function TypeTile({
  colour,
  icon: Icon,
  size = 'default',
  className,
}: {
  colour: TypeColour
  icon: LucideIcon
  size?: 'default' | 'sm'
  className?: string
}) {
  return (
    <span
      data-colour={colour}
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center text-tc-text',
        colour === 'none'
          ? 'bg-muted'
          : 'bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)]',
        size === 'sm' ? 'size-6 rounded-sm [&_svg]:size-3.5' : 'size-8 rounded-md [&_svg]:size-4',
        className,
      )}
    >
      <Icon />
    </span>
  )
}
