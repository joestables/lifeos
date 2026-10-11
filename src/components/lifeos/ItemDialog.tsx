import type { LucideIcon } from 'lucide-react'
import { XIcon } from 'lucide-react'
import { useRef } from 'react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TypeColour } from './colours'
import { TypeScope } from './TypeScope'
import { TypeTile } from './TypeTile'

/**
 * An Item opened as a popup (patterns.md#opening-an-item): centred, never
 * attached to an edge. The header names the Type and holds the Item's
 * actions and Close; the title and the rest scroll in a ScrollArea.
 */
export function ItemDialog({
  open,
  onOpenChange,
  colour,
  icon,
  typeLabel,
  title,
  leading,
  actions,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  colour: Exclude<TypeColour, 'none'>
  icon: LucideIcon
  typeLabel: string
  title: React.ReactNode
  /** Before the title: a Task's checkbox. */
  leading?: React.ReactNode
  /** The Item's mark and "…" menu. */
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  const popup = useRef<HTMLDivElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // Focus the popup itself, not its first control: no ring on the star
        // as it opens; Tab goes on from there.
        initialFocus={popup}
        ref={popup}
        className="max-h-[calc(100svh-36px)] max-w-[580px] gap-0 overflow-hidden p-0"
      >
        <TypeScope colour={colour} className="flex min-h-0 flex-col">
          <div className="flex items-center gap-1 pt-3.5 pr-3.5 pl-5">
            <span className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
              <TypeTile colour={colour} icon={icon} size="sm" />
              {typeLabel}
            </span>
            {actions}
            <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
              <XIcon />
            </DialogClose>
          </div>
          <ScrollArea className="min-h-0">
            <div className="flex flex-col gap-4 px-5 pt-2.5 pb-5">
              <div className="flex items-center gap-3 pt-1">
                {leading}
                <DialogTitle className="text-day">{title}</DialogTitle>
              </div>
              {children}
            </div>
          </ScrollArea>
        </TypeScope>
      </DialogContent>
    </Dialog>
  )
}
