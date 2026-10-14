import type { LucideIcon } from 'lucide-react'
import { PlusIcon } from 'lucide-react'
import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TypeColour } from './colours'
import { TypeTile } from './TypeTile'

export interface AddChoice {
  key: string
  label: string
  colour: Exclude<TypeColour, 'none'>
  icon: LucideIcon
}

/**
 * A day's "+" (PLN-006): a menu of the Schedulable Types there are, each with
 * its tile, under the day it adds to. Its trigger is the day's ghost "+",
 * Plan's "Add" or a phone's Fab.
 */
export function AddToDay({
  day,
  choices,
  onChoose,
  trigger,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'end',
}: {
  /** "Thu 15 Oct" */
  day: string
  choices: AddChoice[]
  onChoose: (key: string) => void
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={trigger ?? <Button variant="ghost" size="icon-sm" aria-label={`Add to ${day}`} />}
      >
        {!trigger && <PlusIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Add to {day}</DropdownMenuLabel>
          {choices.map((c) => (
            <DropdownMenuItem key={c.key} onClick={() => onChoose(c.key)}>
              <TypeTile colour={c.colour} icon={c.icon} size="sm" />
              {c.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
