import { cn } from '@/lib/utils'
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
 * actions and Close; the title and the rest scroll in a ScrollArea. A
 * Task's and an Event's are 440px high on a phone (tokens.md#sizes).
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
  titleField,
  wide = false,
  standard = false,
  footer,
  keepOnOutsideClick = false,
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
  /** The title, editable in place (a Note's); `title` stays the Dialog's name. */
  titleField?: React.ReactNode
  /** 640px, for a Note. */
  wide?: boolean
  /** On a phone, one height whatever it holds, its body scrolling: a Task's or an Event's. */
  standard?: boolean
  /** Under the scrolling body: Cancel and Save, for a new Item kept only on Save. */
  footer?: React.ReactNode
  /** Clicking outside doesn't close it: something typed would be lost. */
  keepOnOutsideClick?: boolean
  children?: React.ReactNode
}) {
  const popup = useRef<HTMLDivElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={keepOnOutsideClick}>
      <DialogContent
        showCloseButton={false}
        // Focus the popup itself, not its first control: no ring on the star
        // as it opens; Tab goes on from there.
        initialFocus={popup}
        ref={popup}
        className={cn(
          'max-h-[calc(100svh-36px)] gap-0 overflow-hidden p-0',
          wide ? 'max-w-[640px]' : 'max-w-[580px]',
          standard && 'max-sm:h-[min(440px,calc(100svh-36px))]',
        )}
      >
        <TypeScope colour={colour} className="flex min-h-0 flex-1 flex-col">
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
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 px-5 pt-2.5 pb-5">
              {titleField ? (
                <DialogTitle className="sr-only">{title}</DialogTitle>
              ) : (
                <div className="flex items-center gap-3 pt-1">
                  {leading}
                  <DialogTitle className="min-w-0 text-day wrap-anywhere">{title}</DialogTitle>
                </div>
              )}
              {titleField}
              {children}
            </div>
          </ScrollArea>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 px-5 pt-1 pb-5">{footer}</div>
          )}
        </TypeScope>
      </DialogContent>
    </Dialog>
  )
}
