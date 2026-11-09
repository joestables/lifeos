import type { LucideIcon } from 'lucide-react'
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { AlarmClockIcon, CalendarClockIcon, PlusIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'
import { TypeTile } from './TypeTile'

/*
 * Stage 7b's draft parts of "New" (not yet agreed): what the line will be
 * saved as, its Alerts and Repeat as chips, and "+ Alert".
 */

/**
 * What the line will be saved as, on the muted fill under the line: the
 * Type's tile and the title, the words for the time taken out, then its
 * chips (Alerts, Repeat, "+ Alert", Alarm) lined up under the title.
 */
export function ParsedTitle({
  colour,
  icon,
  title,
  placeholder,
  children,
  className,
}: {
  colour: Exclude<TypeColour, 'none'>
  icon: LucideIcon
  /** Empty: `placeholder` shows, muted. */
  title: string
  placeholder?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-row bg-background p-3.5', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <TypeTile colour={colour} icon={icon} size="sm" />
        <span className={cn('truncate text-base font-semibold', !title && 'text-muted-foreground')}>
          {title || placeholder}
        </span>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 pl-[34px]">{children}</div>}
    </div>
  )
}

/** Alarm, as a chip at the end of the row: on, every Alert rings (REM-011). */
export function AlarmChip({ defaultPressed = false }: { defaultPressed?: boolean }) {
  return (
    <TogglePrimitive
      defaultPressed={defaultPressed}
      aria-label="Alarm"
      data-colour="blue"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft data-pressed:bg-card data-pressed:text-tc-text data-pressed:shadow-card [&_svg]:size-3.5"
    >
      <AlarmClockIcon aria-hidden />
      Alarm
    </TogglePrimitive>
  )
}

/**
 * An Alert or a Repeat, understood or added: a 32px pill on the card fill,
 * its icon (bell, alarm clock, repeat), when, and × to remove it. Tapping it
 * opens the Alert to change it; `alarm` tints the icon in the Type's colour.
 */
export function WhenChip({
  icon: Icon,
  children,
  alarm = false,
  onOpen,
  onRemove,
  removeLabel,
}: {
  icon: LucideIcon
  children: ReactNode
  alarm?: boolean
  onOpen?: () => void
  onRemove?: () => void
  removeLabel?: string
}) {
  return (
    <span
      data-slot="when-chip"
      className="inline-flex h-8 shrink-0 items-center rounded-full bg-card text-sm font-semibold whitespace-nowrap tabular-nums shadow-card"
    >
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-full items-center gap-1.5 rounded-full pr-1 pl-3 outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
      >
        <Icon
          aria-hidden
          data-colour="blue"
          className={cn('size-3.5', alarm ? 'text-tc-text' : 'text-muted-foreground')}
        />
        {children}
      </button>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="mr-1 grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
      >
        <XIcon />
      </button>
    </span>
  )
}

/**
 * "+ Alert": a dashed pill opening quick times and "Pick a date and time".
 * `label` is "Alert", or "Add a time" when there is none yet.
 */
export function AddAlertMenu({
  label = 'Alert',
  choices,
  open,
}: {
  label?: string
  /** "In an hour", "15:20". */
  choices: { label: string; when: string }[]
  open?: boolean
}) {
  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
          />
        }
      >
        <PlusIcon aria-hidden />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Remind me</DropdownMenuLabel>
          {choices.map((c) => (
            <DropdownMenuItem key={c.label}>
              <span className="flex-1">{c.label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{c.when}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <CalendarClockIcon /> Pick a date and time
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
