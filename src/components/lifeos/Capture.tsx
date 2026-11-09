import type { LucideIcon } from 'lucide-react'
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { AlarmClockIcon, BellIcon, CalendarClockIcon, PlusIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { TypeTile } from './TypeTile'
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

/*
 * Stage 7b's draft parts of "New" (not yet agreed): what the line will be
 * saved as, its Alerts and Repeat as chips, and "+ Alert".
 */

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

/*
 * Stage 7b's second round of "New" (drafts, not yet agreed): no Thought /
 * Alert switch. A title, and when; with a time it is an Alert, without
 * one a Thought, and Save says which.
 */

/** "New" without the Types' switch: its title, what goes in it, then Cancel and Save ("Save alert"). */
export function NewDialog({
  children,
  saveLabel,
  saveDisabled = false,
  footerStart,
  title = 'New',
  switcher,
}: {
  /** At the title's end: the Alert / Thought switch, where a variation keeps it. */
  switcher?: ReactNode
  children: ReactNode
  saveLabel: string
  saveDisabled?: boolean
  /** At the footer's start: "+ Alert", Alarm. */
  footerStart?: ReactNode
  title?: string
}) {
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="top-[76px] max-w-[600px] translate-y-0 gap-0 p-0 sm:top-[12svh]"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-[18px] pt-[18px] sm:pr-5 sm:pl-[22px]">
            <DialogTitle className="flex-1">{title}</DialogTitle>
            {switcher}
          </div>
          <div className="flex flex-col gap-3 px-[18px] pt-4 pb-[18px] sm:px-5">{children}</div>
          <DialogFooter className="items-center px-[18px] pb-[18px] sm:px-5 sm:pb-5">
            {footerStart && (
              <div className="mr-auto flex flex-wrap items-center gap-2">{footerStart}</div>
            )}
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button disabled={saveDisabled}>{saveLabel}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A quick time ("In 1 hour"): a pill, outlined; chosen, on the card fill in the Type's colour. */
export function QuickChip({
  children,
  pressed,
  icon: Icon,
}: {
  children: ReactNode
  pressed?: boolean
  icon?: LucideIcon
}) {
  return (
    <TogglePrimitive
      defaultPressed={pressed}
      data-colour="blue"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground tabular-nums shadow-[inset_0_0_0_1px_var(--border)] outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft data-pressed:bg-card data-pressed:text-tc-text data-pressed:shadow-card [&_svg]:size-3.5"
    >
      {Icon && <Icon aria-hidden />}
      {children}
    </TogglePrimitive>
  )
}

/** A row of chips that scrolls sideways on a phone rather than wrapping. */
export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        '-mx-[18px] -my-1 flex items-center gap-2 overflow-x-auto px-[18px] py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * One line that understands as it goes: the words typed are the title, and
 * each Alert — a time typed, or one added from the quick times — is a pill
 * in the line after them ("Clean bedroom [Tue 10 Nov, 20:00 ×]"): tapping
 * it opens the Alert dialog (its date and time, and Alarm); × or Backspace
 * removes it. A picture of the line, for the design.
 */
export function SmartLine({
  text,
  tokens = [],
  placeholder,
}: {
  text: string
  tokens?: { label: string; alarm?: boolean }[]
  placeholder?: string
}) {
  return (
    <div className="flex min-h-13 min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-control bg-card px-4 py-2.5 text-[16px] ring-3 ring-ring-soft">
      {text ? <span className="min-w-0">{text}</span> : null}
      {tokens.map((t) => {
        const Icon = t.alarm ? AlarmClockIcon : BellIcon
        return (
          <span
            key={t.label}
            data-colour="blue"
            className="inline-flex h-7 shrink-0 items-center rounded-md bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] text-sm font-semibold text-tc-text tabular-nums"
          >
            <button
              type="button"
              aria-label={`Change alert ${t.label}`}
              className="inline-flex h-full items-center gap-1 rounded-md pr-0.5 pl-2 outline-none focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
            >
              <Icon aria-hidden />
              {t.label}
            </button>
            <button
              type="button"
              aria-label={`Remove alert ${t.label}`}
              className="mr-0.5 grid size-6 place-items-center rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
            >
              <XIcon />
            </button>
          </span>
        )
      })}
      <span aria-hidden className="h-5 w-px shrink-0 bg-foreground" />
      {!text && tokens.length === 0 && (
        <span className="-ml-2 text-muted-foreground">{placeholder}</span>
      )}
    </div>
  )
}

/**
 * At the top right of "New": what Save will make — an Alert (a time is
 * in the line) or a Thought — as the Type's tile, named for a screen reader.
 */
export function SavesAs({
  colour,
  icon,
  label,
}: {
  colour: Exclude<TypeColour, 'none'>
  icon: LucideIcon
  label: string
}) {
  return (
    <span role="img" aria-label={`Saves as a ${label}`} title={label} className="flex">
      <TypeTile colour={colour} icon={icon} />
    </span>
  )
}
