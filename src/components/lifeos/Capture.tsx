import type { LucideIcon } from 'lucide-react'
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { AlarmClockIcon, BellIcon, CalendarClockIcon, PlusIcon, XIcon } from 'lucide-react'
import type * as React from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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

/*
 * Stage 7b's second round of "New" (drafts, not yet agreed): no Thought /
 * Reminder switch. A title, and when; with a time it is a Reminder, without
 * one a Thought, and Save says which.
 */

/** "New" without the Types' switch: its title, what goes in it, then Cancel and Save ("Save reminder"). */
export function NewDialog({
  children,
  saveLabel,
  saveDisabled = false,
  footerStart,
  title = 'New',
  switcher,
}: {
  /** At the title's end: the Reminder / Thought switch, where a variation keeps it. */
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

/** A field with an icon at its start: "When" with a bell. `size` as Input's. */
export function IconField({
  icon: Icon,
  colour,
  size = 'default',
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'size'> & {
  icon: LucideIcon
  colour?: Exclude<TypeColour, 'none'>
  size?: 'default' | 'lg'
}) {
  return (
    <div className={cn('relative', className)}>
      <Icon
        aria-hidden
        data-colour={colour}
        className={cn(
          'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2',
          colour ? 'text-tc-text' : 'text-muted-foreground',
        )}
      />
      <Input size={size} className="pl-10" {...props} />
    </div>
  )
}

/**
 * Two fields as one control: the title, then when — side by side on a
 * computer, stacked on a phone — on one input fill with a hairline between.
 * Enter in the first goes to the second (enterKeyHint "next").
 */
export function JoinedFields({
  first,
  second,
  className,
}: {
  first: React.ComponentProps<'input'>
  second: React.ComponentProps<'input'> & { icon: LucideIcon }
  className?: string
}) {
  const { icon: Icon, ...secondProps } = second
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-control bg-input focus-within:bg-card focus-within:ring-3 focus-within:ring-ring-soft sm:flex-row',
        className,
      )}
    >
      <input
        enterKeyHint="next"
        className="h-13 w-full min-w-0 shrink-0 bg-transparent px-4 text-[16px] outline-none placeholder:text-muted-foreground sm:w-auto sm:flex-1"
        {...first}
      />
      <div className="flex h-12 items-center gap-2 border-t border-border px-4 sm:h-13 sm:w-56 sm:border-t-0 sm:border-l">
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <input
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          {...secondProps}
        />
      </div>
    </div>
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
 * A grouped form, as a phone's settings are: rows on the background fill,
 * hairlines between, each an icon, a field or a label, and a value or
 * control at its end.
 */
export function FieldGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-row bg-background">
      {children}
    </div>
  )
}

export function FieldGroupRow({
  icon: Icon,
  colour,
  children,
  trailing,
}: {
  icon: LucideIcon
  colour?: Exclude<TypeColour, 'none'>
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="flex min-h-13 items-center gap-3 px-3.5">
      <Icon
        aria-hidden
        data-colour={colour}
        className={cn('size-4 shrink-0', colour ? 'text-tc-text' : 'text-muted-foreground')}
      />
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {trailing && (
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground tabular-nums">
          {trailing}
        </div>
      )}
    </div>
  )
}

/** A field with no fill of its own, inside a FieldGroupRow. */
export function BareInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-13 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

/**
 * One line that understands as it goes: the words typed, and the time they
 * name drawn as a pill inside the line ("clean bedroom [Tue 20:00]"). A
 * picture of the line, for the design.
 */
export function SmartLine({
  text,
  token,
  placeholder,
}: {
  text: string
  token?: string
  placeholder?: string
}) {
  return (
    <div className="flex h-13 min-w-0 items-center gap-2 rounded-control bg-card px-4 text-[16px] ring-3 ring-ring-soft">
      {text ? <span className="truncate">{text}</span> : null}
      {token && (
        <span
          data-colour="blue"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-[color-mix(in_oklch,var(--tc)_var(--tile-mix),transparent)] px-2 text-sm font-semibold text-tc-text tabular-nums [&_svg]:size-3.5"
        >
          <BellIcon aria-hidden />
          {token}
        </span>
      )}
      <span aria-hidden className="h-5 w-px shrink-0 bg-foreground" />
      {!text && !token && <span className="-ml-2 text-muted-foreground">{placeholder}</span>}
    </div>
  )
}

/** Reminder | Thought, as capture's switch is: Reminder first, and chosen to start. */
export function TypeSwitch({
  types,
  value,
}: {
  types: { key: string; label: string; colour: TypeColour; icon: LucideIcon }[]
  value: string
}) {
  return (
    <ToggleGroup aria-label="Save as" defaultValue={[value]}>
      {types.map((t) => (
        <ToggleGroupItem key={t.key} value={t.key}>
          <t.icon data-colour={t.colour} className="text-tc-text" aria-hidden />
          {t.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
