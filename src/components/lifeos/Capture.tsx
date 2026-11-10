import type { LucideIcon } from 'lucide-react'
import { AlarmClockIcon, BellIcon, CalendarClockIcon, PlusIcon, XIcon } from 'lucide-react'
import { useRef, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
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
 * "New" (components.md, Stage 7b): one smart line making a Thought or a
 * Reminder, its Alerts as pills in the line, quick times under it.
 */

const PILL =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground tabular-nums shadow-[inset_0_0_0_1px_var(--border)] outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5'

/**
 * "More" under the line: the quick times, each with when it is, and "Pick a
 * date and time" (NEW-005 3).
 */
export function AddAlertMenu({
  label = 'More',
  choices,
  onPick,
  open,
}: {
  label?: string
  /** "In 1 hour", "15:20". */
  choices: { label: string; when: string; onChoose?: () => void }[]
  /** Opens the Alert dialog for any date and time. */
  onPick?: () => void
  open?: boolean
}) {
  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger render={<button type="button" className={PILL} />}>
        <PlusIcon aria-hidden />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Remind me</DropdownMenuLabel>
          {choices.map((c) => (
            <DropdownMenuItem key={c.label} onClick={c.onChoose}>
              <span className="flex-1">{c.label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{c.when}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onPick}>
          <CalendarClockIcon /> Pick a date and time
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * "New" (NEW-002): capture's Dialog near the top, titled "New", what Save
 * makes at its top right (SavesAs), the line and what goes under it, then
 * Cancel and Save. Enter in the line saves.
 */
export function NewDialog({
  open,
  onOpenChange,
  savesAs,
  children,
  onSave,
  saveDisabled = false,
  title = 'New',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** At the title's end: SavesAs. */
  savesAs?: ReactNode
  children: ReactNode
  onSave: () => void
  saveDisabled?: boolean
  title?: string
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!saveDisabled) onSave()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[76px] max-w-[600px] translate-y-0 gap-0 p-0 sm:top-[12svh]"
      >
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center gap-3 px-[18px] pt-[18px] sm:pr-5 sm:pl-[22px]">
            <DialogTitle className="flex-1">{title}</DialogTitle>
            {savesAs}
          </div>
          <div className="flex flex-col gap-3 px-[18px] pt-4 pb-[18px] sm:px-5">{children}</div>
          <DialogFooter className="items-center px-[18px] pb-[18px] sm:px-5 sm:pb-5">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saveDisabled}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * A quick time ("In 1 hour"): an outlined 32px pill; tapping it adds its
 * Alert, and it doesn't stay chosen (NEW-005 2).
 */
export function QuickChip({
  children,
  icon: Icon,
  onClick,
}: {
  children: ReactNode
  icon?: LucideIcon
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={PILL}>
      {Icon && <Icon aria-hidden />}
      {children}
    </button>
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

/** An Alert in the line: "Tue 10 Nov, 20:00", an Alarm with its alarm clock. */
export interface LinePill {
  id: string
  label: string
  alarm?: boolean
}

/**
 * One line that understands as it goes (NEW-002–004): the words typed, then
 * each Alert — a time typed, or one added from the quick times — as a pill
 * in the Reminder's tint: tapping it opens the Alert dialog (its date and
 * time, and Alarm); × removes it, and so does Backspace at the end of the
 * line when the words end there.
 */
export function SmartLine({
  value,
  onValueChange,
  pills = [],
  onOpenPill,
  onRemovePill,
  placeholder,
  inputRef,
  label = 'New',
}: {
  value: string
  onValueChange?: (value: string) => void
  pills?: LinePill[]
  onOpenPill?: (id: string) => void
  onRemovePill?: (id: string) => void
  placeholder?: string
  inputRef?: RefObject<HTMLInputElement | null>
  /** The line's name for a screen reader. */
  label?: string
}) {
  const own = useRef<HTMLInputElement>(null)
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const atEnd = el.selectionStart === value.length && el.selectionEnd === value.length
    if (e.key === 'Backspace' && atEnd && pills.length > 0 && (value === '' || /\s$/.test(value))) {
      e.preventDefault()
      onRemovePill?.(pills.at(-1)!.id)
    }
  }
  const ref = inputRef ?? own
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && ref.current?.focus()}
      className="flex min-h-13 min-w-0 cursor-text flex-wrap items-center gap-x-2 gap-y-1.5 rounded-control bg-input px-4 py-2.5 text-[16px] transition-[background-color,box-shadow] focus-within:bg-card focus-within:ring-3 focus-within:ring-ring-soft"
    >
      {/* The input as wide as its words, so the pills follow them. */}
      <span className="inline-grid min-w-0 max-w-full">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
          {value || placeholder || ' '}{' '}
        </span>
        <input
          ref={ref}
          aria-label={label}
          autoComplete="off"
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => onValueChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </span>
      {pills.map((t) => {
        const Icon = t.alarm ? AlarmClockIcon : BellIcon
        return (
          <span
            key={t.id}
            data-colour="blue"
            data-slot="line-pill"
            className="inline-flex h-7 shrink-0 items-center rounded-md bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] text-sm font-semibold text-tc-text tabular-nums"
          >
            <button
              type="button"
              aria-label={`Change alert ${t.label}`}
              onClick={() => onOpenPill?.(t.id)}
              className="inline-flex h-full items-center gap-1 rounded-md pr-0.5 pl-2 outline-none focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
            >
              <Icon aria-hidden />
              {t.label}
            </button>
            <button
              type="button"
              aria-label={`Remove alert ${t.label}`}
              onClick={() => onRemovePill?.(t.id)}
              className="mr-0.5 grid size-6 place-items-center rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
            >
              <XIcon />
            </button>
          </span>
        )
      })}
    </div>
  )
}

/**
 * At the top right of "New": what Save will make — a Reminder (a time is
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
