import {
  CheckIcon,
  DumbbellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  MinusIcon,
  NotebookPenIcon,
  PencilIcon,
  PlusIcon,
  FrownIcon,
  MehIcon,
  SmileIcon,
  TrophyIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { Reorder } from '@/hooks/use-reorder'
import { REORDER_ROW } from './reorder'
import { cn } from '@/lib/utils'
import { readinessColour } from './readiness'

/* ---------- Layout ---------- */

/**
 * A Card's heading row (Today, Recent workouts, Templates): its title
 * (`text-h2`), an optional count, then anything at its end (a sort).
 */
export function PanelHeading({
  title,
  count,
  children,
}: {
  title: ReactNode
  count?: number
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <h2 className="text-h2">{title}</h2>
      {count !== undefined && (
        <Badge variant="outline" className="tabular-nums">
          {count}
        </Badge>
      )}
      <span className="flex-1" />
      {children}
    </div>
  )
}

/**
 * A row inside a Card (components.md, PanelRow): a leading tile or ring,
 * the title (weight 600) and a muted meta line joined by "·", anything at
 * its end, and a chevron when it leads somewhere. Hover and the chosen row
 * fill `--accent`; no card of its own, so a list in a Card stays calm.
 */
export function PanelRow({
  leading,
  title,
  meta = [],
  trailing,
  chevron = true,
  selected = false,
  onOpen,
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  meta?: ReactNode[]
  trailing?: ReactNode
  chevron?: boolean
  selected?: boolean
  /** What choosing it does: Enter and Space too. */
  onOpen?: () => void
  className?: string
}) {
  return (
    <div
      // A button only when choosing it does something.
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-current={selected || undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
        e.preventDefault()
        onOpen?.()
      }}
      className={cn(
        '-mx-2 flex min-h-14 items-center gap-3 rounded-row px-2 py-2 outline-none',
        onOpen &&
          'cursor-pointer hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring-soft',
        selected && 'bg-accent hover:bg-accent',
        className,
      )}
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{title}</span>
        {meta.length > 0 && (
          <span className="truncate text-sm text-muted-foreground tabular-nums">
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && <span aria-hidden> · </span>}
                {m}
              </span>
            ))}
          </span>
        )}
      </span>
      {trailing}
      {chevron && (
        <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  )
}

/** "All workouts" at a Card's foot: a ghost button the Card's width with a chevron. */
export function PanelFooter({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button variant="ghost" className="-mx-2 -mb-2 justify-between" onClick={onClick}>
      {label}
      <ChevronRightIcon className="text-muted-foreground" />
    </Button>
  )
}

/**
 * A figure (components.md, StatTile): a 12px muted label, the value
 * (`text-h2`, tabular) and an optional muted line. `inset`, inside a Card,
 * on a `--muted` fill; otherwise a Card of its own.
 */
export function StatTile({
  label,
  value,
  sub,
  inset = false,
  icon,
  onClick,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  inset?: boolean
  icon?: ReactNode
  /** A figure that leads somewhere (a PR to its workout) is a button. */
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick && { type: 'button' as const, onClick })}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 px-4 py-3 text-left',
        inset ? 'rounded-row bg-accent/60' : 'rounded-lg bg-card shadow-card',
        onClick &&
          'cursor-pointer outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="truncate text-h2 tabular-nums">{value}</span>
      {sub && <span className="truncate text-xs text-muted-foreground tabular-nums">{sub}</span>}
    </Tag>
  )
}

/**
 * A Gym page's two columns on a computer: the main one and a 360px one
 * beside it (stimulus sets, coverage); stacked on a phone.
 */
export function SideColumns({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">{children}</div>
}

/**
 * A list beside what is chosen from it (Progression on a computer): a
 * 340px column, then the rest; on a phone only the list, and the chosen
 * one opens its own page.
 */
export function ListDetail({ list, detail }: { list: ReactNode; detail?: ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="min-w-0">{list}</div>
      {detail && <div className="hidden min-w-0 flex-col gap-5 lg:flex">{detail}</div>}
    </div>
  )
}

/* ---------- Workouts ---------- */

export type WorkoutState = 'complete' | 'in-progress' | 'planned' | 'skipped'

const STATE: Record<
  WorkoutState,
  { label: string; variant: 'success' | 'warning' | 'outline' | 'destructive' }
> = {
  complete: { label: 'Complete', variant: 'success' },
  'in-progress': { label: 'In progress', variant: 'warning' },
  planned: { label: 'Planned', variant: 'outline' },
  skipped: { label: 'Skipped', variant: 'destructive' },
}

/** A workout's state as a pill with a dot and its word (GYM-007 5; Joe, 31 October). */
export function WorkoutStatePill({ state }: { state: WorkoutState }) {
  const s = STATE[state]
  return (
    <Badge variant={s.variant}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  )
}

/* ---------- Steppers and sets ---------- */

/**
 * A value moved by − and +, or typed: a `--muted` box with ghost buttons
 * either side of the value at a fixed width. `sm`, 32px; default, 40px;
 * `lg`, 52px with the value at `text-day`, for the set popup.
 */
export function ValueStepper({
  value,
  unit,
  label,
  onStep,
  canDown = true,
  canUp = true,
  size = 'default',
  onType,
}: {
  value: string
  /** After the value, muted ("kg"). */
  unit?: string
  /** What it changes ("Weight"): its buttons say "Less weight", "More weight". */
  label: string
  onStep?: (direction: -1 | 1) => void
  canDown?: boolean
  canUp?: boolean
  size?: 'sm' | 'default' | 'lg'
  /** The value typed too (GYM-010 2): each keystroke's text, the shown value kept while typing. */
  onType?: (text: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const button = cn(
    size === 'sm' && 'size-7 [&_svg]:size-3.5',
    size === 'lg' && 'size-10 shrink-0 rounded-[10px] [&_svg]:size-5',
  )
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-between rounded-control bg-muted',
        size === 'sm' && 'h-8 p-0.5',
        size === 'default' && 'h-10 gap-1 p-1',
        size === 'lg' && 'h-[52px] w-full gap-1 p-1',
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Less ${label.toLowerCase()}`}
        disabled={!canDown}
        onClick={() => onStep?.(-1)}
        className={button}
      >
        <MinusIcon />
      </Button>
      <span
        aria-live="polite"
        className={cn(
          'flex items-baseline justify-center gap-1 font-semibold tabular-nums',
          size === 'sm' && 'min-w-9 text-sm',
          size === 'default' && 'min-w-12 text-sm',
          size === 'lg' && 'min-w-0 flex-1 text-day',
        )}
      >
        {onType ? (
          <input
            aria-label={label}
            inputMode="decimal"
            value={draft ?? value}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setDraft(e.target.value)
              onType(e.target.value)
            }}
            onBlur={() => setDraft(null)}
            className="w-full min-w-0 bg-transparent text-center outline-none"
          />
        ) : (
          value
        )}
        {unit && <span className="text-sm font-semibold text-muted-foreground">{unit}</span>}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`More ${label.toLowerCase()}`}
        disabled={!canUp}
        onClick={() => onStep?.(1)}
        className={button}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

/** A field in the set popup: its label (and a muted line) on the left, a large stepper on the right. */
export function StepperField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-sm text-muted-foreground tabular-nums">{hint}</span>}
      </span>
      <div className="w-[58%] max-w-60">{children}</div>
    </div>
  )
}

export type LoggedSet = {
  /** Missing for a quick set. */
  weight?: string
  reps?: number
  rir?: number
  pr?: boolean
  /** Its strength (the review, Strength history). */
  strength?: string
}

/**
 * A logged set, read as text (GYM-010 4): its number in a 28px `--muted`
 * circle, "30 kg × 10" (weight 600, units muted) and "(2 RIR)" muted, a PR
 * badge, its strength where shown, then an edit button that opens it. A
 * quick set says "Quick set", muted.
 */
export function SetLine({ n, set, onEdit }: { n: number; set: LoggedSet; onEdit?: () => void }) {
  const quick = set.weight === undefined
  return (
    <div className="flex h-11 items-center gap-3 rounded-control pr-1 pl-1">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground tabular-nums">
        {n}
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        {quick ? (
          <span className="text-sm text-muted-foreground">Quick set</span>
        ) : (
          <>
            <span className="font-semibold tabular-nums">{set.weight}</span>
            <span className="text-sm text-muted-foreground">kg</span>
            <span className="px-0.5 text-muted-foreground">×</span>
            <span className="font-semibold tabular-nums">{set.reps}</span>
            <span className="pl-1.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
              ({set.rir} RIR)
            </span>
          </>
        )}
      </span>
      {set.pr && <PrBadge />}
      {set.strength && (
        <span className="w-12 text-right text-sm text-muted-foreground tabular-nums">
          {set.strength}
        </span>
      )}
      {onEdit && <EditSet n={n} onEdit={onEdit} />}
    </div>
  )
}

/** A PR's mark: a `type` Badge with a trophy (SetTable, Best sets). */
export function PrBadge() {
  return (
    <Badge variant="type">
      <TrophyIcon aria-hidden />
      PR
    </Badge>
  )
}

function EditSet({ n, onEdit }: { n: number; onEdit?: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Edit set ${n}`} onClick={onEdit}>
      <PencilIcon />
    </Button>
  )
}

/**
 * Logged sets as a quiet table (GYM-010 4, the other option): Set, kg,
 * Reps and RIR as 12px muted heads, a row each with the figures in
 * tabular weight 600 (a quick set's row says so across them), a PR badge
 * and strength where shown, and an edit button. No lines but a hairline
 * under the heads.
 */
export function SetTable({
  sets,
  editable = false,
  strength = false,
  onEdit,
}: {
  sets: LoggedSet[]
  editable?: boolean
  strength?: boolean
  /** A row's edit button: opens set `i` in the popup. */
  onEdit?: (i: number) => void
}) {
  // Written out whole, so Tailwind sees each.
  // Figures up to 80px wide, so they don't drift apart on a computer, and
  // narrower when the card is; the PR column takes what is left.
  const grid = strength
    ? editable
      ? 'grid-cols-[28px_repeat(3,minmax(0,80px))_minmax(60px,1fr)_56px_32px]'
      : 'grid-cols-[28px_repeat(3,minmax(0,80px))_minmax(60px,1fr)_56px]'
    : editable
      ? 'grid-cols-[28px_repeat(3,minmax(0,80px))_minmax(60px,1fr)_32px]'
      : 'grid-cols-[28px_repeat(3,minmax(0,80px))_minmax(60px,1fr)]'
  const cols = cn('grid items-center gap-2', grid)
  return (
    <div role="table" className="flex flex-col">
      <div
        role="row"
        className={cn(
          cols,
          'h-8 border-b border-foreground/7 px-1 text-xs font-semibold text-muted-foreground',
        )}
      >
        <span role="columnheader">Set</span>
        <span role="columnheader">kg</span>
        <span role="columnheader">Reps</span>
        <span role="columnheader">RIR</span>
        <span />
        {strength && (
          <span role="columnheader" className="text-right">
            Strength
          </span>
        )}
        {editable && <span />}
      </div>
      {sets.map((set, i) => (
        <div key={i} role="row" className={cn(cols, 'h-11 px-1')}>
          <span className="text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
          {set.weight === undefined ? (
            <>
              <span className="text-muted-foreground" aria-label="Quick set">
                –
              </span>
              <span className="text-muted-foreground">–</span>
              <span className="text-muted-foreground">–</span>
            </>
          ) : (
            <>
              <span className="font-semibold tabular-nums">{set.weight}</span>
              <span className="font-semibold tabular-nums">{set.reps}</span>
              <span className="font-semibold tabular-nums">{set.rir}</span>
            </>
          )}
          <span>{set.pr && <PrBadge />}</span>
          {strength && (
            <span className="text-right text-sm text-muted-foreground tabular-nums">
              {set.strength}
            </span>
          )}
          {editable && <EditSet n={i + 1} onEdit={() => onEdit?.(i)} />}
        </div>
      ))}
    </div>
  )
}

/**
 * The next set to log (GYM-010 1): a 44px dashed box, muted "+ Log set 3
 * of 3"; `--accent` on hover.
 */
export function LogSetButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center gap-2 rounded-control border-[1.5px] border-dashed border-border px-3 text-sm font-semibold text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft"
    >
      <PlusIcon className="size-4" />
      {label}
    </button>
  )
}

/** An exercise's Current set on a line of its own, muted with a `weight` (GYM-008 4). */
export function CurrentLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
      <DumbbellIcon aria-hidden className="size-3.5 shrink-0" />
      <span>Current {children}</span>
    </span>
  )
}

/** An exercise's setup and form notes, muted with a `notebook-pen`. */
export function FormNotes({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-sm text-muted-foreground">
      <NotebookPenIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/**
 * An exercise in a workout or a template (GYM-008, GYM-006): a card-filled
 * `--radius-row` box. First its expand button (a workout) or drag handle (a
 * template), then its name (weight 600) and a muted line, then its own
 * control (a workout's DoneToggle, or a template's sets stepper) and its
 * "…". A done exercise's name is struck through (Joe, 14 November); it
 * still expands. Expanded, what
 * it holds sits under its name.
 */
export function ExerciseCard({
  name,
  meta,
  open = false,
  drag = false,
  done = false,
  control,
  menu,
  reorder,
  onToggle,
  children,
}: {
  name: string
  /** Its muted line's parts, joined by "·"; a line breaks only between parts. */
  meta: ReactNode[]
  open?: boolean
  /** A template's: a drag handle where the expand button is. */
  drag?: boolean
  /** The handle's drag (useReorder): the card under it is ringed, the dragged one faded. */
  reorder?: Reorder
  /** The expand button: open or close it. */
  onToggle?: () => void
  done?: boolean
  control?: ReactNode
  menu?: ReactNode
  children?: ReactNode
}) {
  return (
    <section
      data-open={open || undefined}
      data-reorder-id={reorder?.id}
      data-reorder={reorder?.state}
      className={cn(
        'flex flex-col rounded-row bg-card shadow-card',
        REORDER_ROW,
        // A long press on a phone drags; it never selects the name.
        drag && 'select-none [-webkit-touch-callout:none]',
      )}
    >
      <div className="flex min-h-[60px] items-center gap-2 py-2 pr-2 pl-2">
        {drag ? (
          <span
            {...reorder?.handle}
            aria-label={`Drag ${name} to reorder`}
            className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-control text-muted-foreground select-none [-webkit-touch-callout:none] hover:bg-accent"
          >
            <GripVerticalIcon className="size-4" />
          </span>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
            onClick={onToggle}
          >
            <ChevronDownIcon className={cn('transition-transform', !open && '-rotate-90')} />
          </Button>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('font-semibold', done && 'line-through')}>{name}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {meta.map((m, i) => (
              <span key={i} className="whitespace-nowrap">
                {i > 0 && <span aria-hidden> · </span>}
                {m}
              </span>
            ))}
          </span>
        </span>
        {control}
        {menu}
      </div>
      {open && children && (
        <div className="flex flex-col gap-2 pr-3 pb-3 pl-3 sm:pl-12">{children}</div>
      )}
    </section>
  )
}

/**
 * An exercise's Done (GYM-011; Joe, 3 November): an `sm` toggle named "Done"
 * in both states, `outline` with a check until pressed, then `success`;
 * pressed again, it is undone, so more sets can be logged.
 */
export function DoneToggle({
  name,
  done,
  onChange,
}: {
  name: string
  done: boolean
  onChange?: (done: boolean) => void
}) {
  return (
    <Button
      variant={done ? 'success' : 'outline'}
      size="sm"
      aria-pressed={done}
      aria-label={`${name} done`}
      onClick={() => onChange?.(!done)}
    >
      <CheckIcon /> Done
    </Button>
  )
}

const MOTIVATION = {
  low: { label: 'Low', icon: FrownIcon, tint: 'destructive' },
  okay: { label: 'Okay', icon: MehIcon, tint: 'warning' },
  high: { label: 'High', icon: SmileIcon, tint: 'success' },
} as const

export type Motivation = keyof typeof MOTIVATION

/**
 * Motivation beforehand (GYM-012 1; Joe, 1 November): three 40px
 * pills side by side, as wide as their words: a face and its word, Low
 * (red), Okay (amber) and High (green). Chosen, a pill takes its colour's
 * tint, text and a 1.5px ring; the others stay muted. Never colour alone:
 * each has its face and word.
 */
export function MotivationChoice({
  value,
  onChange,
}: {
  value: Motivation | null
  /** Chosen again, it is unchosen (optional, GYM-012 1). */
  onChange?: (value: Motivation | null) => void
}) {
  return (
    <div role="radiogroup" aria-label="Motivation beforehand" className="flex flex-wrap gap-2">
      {(Object.keys(MOTIVATION) as Motivation[]).map((k) => {
        const m = MOTIVATION[k]
        const on = k === value
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange?.(on ? null : k)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-[18px]',
              !on && 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
              !on && m.tint === 'destructive' && '[&_svg]:text-destructive',
              !on && m.tint === 'warning' && '[&_svg]:text-warning',
              !on && m.tint === 'success' && '[&_svg]:text-success',
              on &&
                m.tint === 'destructive' &&
                'bg-[color-mix(in_oklch,var(--destructive)_15%,transparent)] text-destructive ring-[1.5px] ring-destructive',
              on &&
                m.tint === 'warning' &&
                'bg-[color-mix(in_oklch,var(--warning)_16%,transparent)] text-warning ring-[1.5px] ring-warning',
              on &&
                m.tint === 'success' &&
                'bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-success ring-[1.5px] ring-success',
            )}
          >
            <m.icon aria-hidden />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

/** A workout's motivation as read (the review): its face and word in its colour. */
export function MotivationBadge({ value }: { value: Motivation }) {
  const m = MOTIVATION[value]
  return (
    <Badge variant={m.tint} className="h-7 px-3 text-sm [&_svg]:size-4">
      <m.icon aria-hidden />
      {m.label}
    </Badge>
  )
}

/* ---------- Coverage and targets ---------- */

/**
 * Stimulus sets against a target (GYM-006 4): the muscle group's name (and
 * a muted line), an 8px bar filled `--primary` to its stimulus sets with
 * the target as a 2px tick, and "2.6 / 4" (tabular).
 */
export function StimulusRow({
  muscle,
  sets,
  target,
  meta,
}: {
  muscle: string
  sets: number
  target: number
  meta?: ReactNode
}) {
  const scale = Math.max(target * 1.5, sets, 1)
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 py-1">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{muscle}</span>
        {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      <span className="relative h-2 rounded-full bg-muted">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          // A computed width: the sets against the bar's scale.
          style={{ width: `${(sets / scale) * 100}%` }}
        />
        {target > 0 && (
          <span
            aria-hidden
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
            // The target's place on the bar.
            style={{ left: `${(target / scale) * 100}%` }}
          />
        )}
      </span>
      <span className="text-right text-sm tabular-nums">
        <span className="font-semibold">{sets.toFixed(1)}</span>
        <span className="text-muted-foreground"> / {target}</span>
      </span>
    </div>
  )
}

/* ---------- Readiness ---------- */

/**
 * Readiness as a ring (GYM-016 3): a 4px `--muted` track and an arc in
 * its colour on the readiness scale, the percentage in the middle.
 */
export function ReadinessRing({ percent, size = 40 }: { percent: number; size?: number }) {
  const r = (size - 5) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative grid shrink-0 place-items-center" aria-label={`${percent} % ready`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-muted [stroke-width:4]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeDasharray={`${(c * percent) / 100} ${c}`}
          className="[stroke-linecap:round] [stroke-width:4]"
          // Its colour on the readiness scale.
          style={{ stroke: readinessColour(percent) }}
        />
      </svg>
      <span
        className={cn('absolute font-bold tabular-nums', size >= 56 ? 'text-base' : 'text-[11px]')}
      >
        {percent}
      </span>
    </span>
  )
}

/** A muscle group's readiness as a bar and its percentage. */
export function ReadinessBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          // A computed width and its colour on the readiness scale.
          style={{ width: `${percent}%`, background: readinessColour(percent) }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums">{percent} %</span>
    </div>
  )
}

/** Overall readiness (GYM-016 1): the figure at `text-display`, its name, and when it stands for. */
export function OverallReadiness({ percent, when }: { percent: number; when: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold text-muted-foreground">
        Overall readiness · {when}
      </span>
      <span className="text-display tabular-nums">{percent} %</span>
    </div>
  )
}

/**
 * Looking ahead (GYM-016 2): a Slider from Now to +48 hours, in hours,
 * with its ends named under it.
 */
export function LookAhead({
  hours,
  onChange,
}: {
  hours: number
  onChange?: (hours: number) => void
}) {
  return (
    // In from each side by an hour's width (Joe, 3 November).
    <div className="flex flex-col gap-1.5 px-[calc(100%/48)]">
      <Slider
        value={hours}
        min={0}
        max={48}
        step={1}
        aria-label="Look ahead"
        onValueChange={(v) => onChange?.(Array.isArray(v) ? v[0]! : v)}
      />
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>Now</span>
        <span>+24 h</span>
        <span>+48 h</span>
      </div>
    </div>
  )
}

/* ---------- Choosing ---------- */

/**
 * A muscle group to choose (GYM-009 1): a 44px button on a `--muted` fill,
 * its name (weight 600) and, muted at its end, how many exercises it has.
 */
export function MuscleChoice({
  name,
  count,
  onClick,
}: {
  name: string
  count: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-between gap-2 rounded-control bg-secondary px-3 text-left text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft"
    >
      <span className="truncate">{name}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </button>
  )
}

/* ---------- Charts ---------- */

export type LineTone = 'coral' | 'grey'
export type LineDash = 'solid' | 'dash' | 'dot'

const dashClass = (dash: LineDash) =>
  dash === 'dash' ? '[stroke-dasharray:6_4]' : dash === 'dot' ? '[stroke-dasharray:1_4]' : ''

/** A line's stroke drawn small, for a pill or a key. */
export function LineSample({ tone, dash }: { tone: LineTone; dash: LineDash }) {
  return (
    <svg width="18" height="8" aria-hidden className="shrink-0">
      <line
        x1="2"
        x2="16"
        y1="4"
        y2="4"
        className={cn(
          '[stroke-linecap:round] [stroke-width:2]',
          tone === 'coral' ? 'stroke-tc' : 'stroke-muted-foreground',
          dashClass(dash),
        )}
      />
    </svg>
  )
}

/**
 * An exercise's line on a muscle group's chart, shown or hidden
 * (GYM-015 3): a 32px pill; on, `--selected` with its LineSample and its
 * name; off, the hairline edge, a muted "+" and its name; disabled while
 * three of its kind are on.
 */
export function LinePill({
  label,
  sub,
  on,
  tone,
  dash,
  disabled = false,
  onClick,
}: {
  label: string
  sub?: string
  on: boolean
  tone: LineTone
  dash?: LineDash
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring-soft disabled:opacity-45',
        on
          ? tone === 'coral'
            ? 'bg-selected text-selected-foreground'
            : 'bg-accent text-foreground'
          : 'text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline)] hover:bg-accent/60',
      )}
    >
      {on && dash ? (
        <LineSample tone={tone} dash={dash} />
      ) : (
        <PlusIcon aria-hidden className="size-3.5" />
      )}
      {label}
      {sub && <span className="font-normal text-muted-foreground tabular-nums">{sub}</span>}
    </button>
  )
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(e.contentRect.width))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export type ChartPoint = {
  /** When the workout ended, ms. */
  at: number
  value: number
  /** Over the point, small and muted: an exercise's reps. */
  above?: string
  /** A larger dot: the PR. */
  mark?: boolean
  /** Its tooltip: a heading ("Mon 28 Oct · Push A") and the line's value as said. */
  title: string
  text: string
}

export type ChartLine = {
  id: string
  label: string
  points: ChartPoint[]
  tone: LineTone
  dash: LineDash
}

/** A week's bar under a chart: its start, its label ("5 Aug") and its stimulus sets. */
export type ChartBar = { start: number; label: string; value: number }

const WEEK_MS = 7 * 86_400_000

/** A tooltip over a chart: `--popover`, beside what it is about. */
function ChartTip({
  left,
  top,
  bottom,
  width,
  children,
}: {
  left: number
  top?: number
  bottom?: number
  width: number
  children: ReactNode
}) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 flex w-max max-w-64 min-w-44 flex-col gap-1 rounded-sm bg-popover p-2.5 text-xs shadow-pop"
      style={{ left: Math.max(0, Math.min(left, width - 256)), top, bottom }}
    >
      {children}
    </div>
  )
}

/**
 * Progression (GYM-014, GYM-015), on time: a point for each workout — an
 * exercise's best set's weight with its reps over it, or a muscle group's
 * exercises' change in %, one scale only — joined by lines in coral or grey,
 * solid, dashed or dotted, a soft area under the first, a larger dot on the
 * PR, a foreground-7% grid; under it, on the same weeks, a muscle's stimulus
 * sets a week as bars with the target dashed. A point and a bar each have
 * their own tooltip (Joe, 3 November): a crosshair and the workout's points
 * over the chart, the week's sets over the bars.
 */
export function ProgressChart({
  from,
  to,
  lines,
  bars,
  target,
  barsLabel,
  unit = '',
  height = 200,
}: {
  from: number
  to: number
  lines: ChartLine[]
  bars: ChartBar[]
  target: number
  barsLabel: string
  unit?: string
  height?: number
}) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const [bar, setBar] = useState<number | null>(null)
  // A tap shows a tooltip until the next tap elsewhere.
  useEffect(() => {
    if (hover === null && bar === null) return
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setHover(null)
        setBar(null)
      }
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [hover, bar, ref])
  const left = 44
  const right = 12
  const h = height
  const bh = 84
  const points = lines.flatMap((l) => l.points)
  const all = points.map((p) => p.value)
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const raw = (hi - lo) / 4 || 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const tick = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((t) => t >= raw) ?? raw
  const y0 = Math.floor(lo / tick) * tick
  const y1 = Math.max(Math.ceil(hi / tick) * tick, y0 + tick)
  const ticks: number[] = []
  for (let t = y0; t <= y1 + tick / 2; t += tick) ticks.push(t)
  const plotW = Math.max(1, width - left - right)
  const x = (t: number) => left + (plotW * (t - from)) / (to - from || 1)
  const top = points.some((p) => p.above) ? 26 : 10
  const bottom = h - 26
  const y = (v: number) => top + (bottom - top) * (1 - (v - y0) / (y1 - y0))
  const bmax = Math.max(target * 1.4, ...bars.map((b) => b.value), 1)
  const bBase = bh - 6
  const by = (v: number) => bBase - ((bBase - 8) * v) / bmax
  const fmt = (v: number) => `${Math.round(v * 10) / 10}${unit}`
  const weekW = (plotW * WEEK_MS) / (to - from || 1)
  const every = Math.max(1, Math.ceil(72 / weekW))
  const mid = (b: ChartBar) => x(b.start + WEEK_MS / 2)
  const first = lines[0]
  let area = ''
  if (first && first.points.length > 1) {
    const pts = first.points.map((p) => [x(p.at), y(p.value)] as const)
    area = `M${pts[0]![0]},${bottom} ${pts.map(([px, py]) => `L${px},${py}`).join(' ')} L${pts[pts.length - 1]![0]},${bottom} Z`
  }
  // Reps over the points, where there is room for them.
  const above = new Set<ChartPoint>()
  let lastX = -Infinity
  for (const p of first?.points ?? []) {
    if (p.above && x(p.at) - lastX >= 18) {
      above.add(p)
      lastX = x(p.at)
    }
  }
  const pointerX = (e: React.PointerEvent<SVGSVGElement>) =>
    e.clientX - e.currentTarget.getBoundingClientRect().left
  const onLines = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = pointerX(e)
    let best: number | null = null
    for (const p of points)
      if (best === null || Math.abs(x(p.at) - px) < Math.abs(x(best) - px)) best = p.at
    setHover(best)
    setBar(null)
  }
  const onBars = (e: React.PointerEvent<SVGSVGElement>) => {
    const t = from + ((pointerX(e) - left) / plotW) * (to - from)
    const i = bars.findIndex((b) => t >= b.start && t < b.start + WEEK_MS)
    setBar(i >= 0 ? i : t >= to && bars.length ? bars.length - 1 : null)
    setHover(null)
  }
  // A mouse leaving clears it; a finger lifting leaves it, until a tap elsewhere.
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      setHover(null)
      setBar(null)
    }
  }
  const at = hover === null ? [] : lines.flatMap((l) => l.points.filter((p) => p.at === hover))
  const chosen = bar === null ? undefined : bars[bar]

  return (
    <div ref={ref} className="relative flex w-full flex-col">
      <svg
        width={width}
        height={h}
        className="touch-pan-y overflow-visible"
        onPointerMove={onLines}
        onPointerDown={onLines}
        onPointerLeave={leave}
      >
        <defs>
          <linearGradient id="gym-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--tc)] [stop-opacity:0.22]" />
            <stop offset="100%" className="[stop-color:var(--tc)] [stop-opacity:0]" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={left}
              x2={width - right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-foreground/7"
            />
            <text
              x={left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#gym-area)" />}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={top - 6}
            y2={bottom}
            className="stroke-foreground/25"
          />
        )}
        {lines.map((l) => (
          <g key={l.id}>
            <path
              d={l.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.at)},${y(p.value)}`).join(' ')}
              fill="none"
              className={cn(
                '[stroke-linecap:round] [stroke-linejoin:round]',
                l.tone === 'coral'
                  ? 'stroke-tc [stroke-width:2.25]'
                  : 'stroke-muted-foreground [stroke-width:1.75]',
                dashClass(l.dash),
              )}
            />
            {l.points.map((p) => (
              <circle
                key={p.at}
                data-point={l.id}
                cx={x(p.at)}
                cy={y(p.value)}
                r={p.mark ? 5 : p.at === hover ? 4.5 : 3}
                className={cn(
                  'stroke-card [stroke-width:2]',
                  l.tone === 'coral' ? 'fill-tc' : 'fill-muted-foreground',
                  p.mark && '[stroke-width:2.5]',
                )}
              />
            ))}
          </g>
        ))}
        {[...above].map((p) => (
          <text
            key={p.at}
            x={x(p.at)}
            y={y(p.value) - (p.mark ? 10 : 8)}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px] font-semibold tabular-nums"
          >
            {p.above}
          </text>
        ))}
        {bars.map((b, i) =>
          i % every === (bars.length - 1) % every ? (
            <text
              key={b.start}
              x={mid(b)}
              y={h - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {b.label}
            </text>
          ) : null,
        )}
      </svg>
      <div className="flex items-center justify-between pt-3 pb-1 pl-11 text-xs font-semibold text-muted-foreground">
        <span>{barsLabel}</span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="6" aria-hidden>
            <line
              x1="1"
              x2="15"
              y1="3"
              y2="3"
              className="stroke-foreground [stroke-dasharray:3_2] [stroke-width:1.5]"
            />
          </svg>
          Target {target}
        </span>
      </div>
      <div className="relative">
        <svg
          width={width}
          height={bh}
          className="touch-pan-y overflow-visible"
          onPointerMove={onBars}
          onPointerDown={onBars}
          onPointerLeave={leave}
        >
          <line
            x1={left}
            x2={width - right}
            y1={bBase}
            y2={bBase}
            className="stroke-foreground/12"
          />
          {bars.map((b, i) => {
            const bw = Math.max(4, Math.min(22, weekW * 0.62))
            return (
              <rect
                key={b.start}
                data-week={b.label}
                x={mid(b) - bw / 2}
                y={by(b.value)}
                width={bw}
                height={Math.max(0, bBase - by(b.value))}
                rx={Math.min(4, bw / 2)}
                className={cn('transition-[fill-opacity]', bar === i ? 'fill-tc' : 'fill-tc/40')}
              />
            )
          })}
          <line
            x1={left}
            x2={width - right}
            y1={by(target)}
            y2={by(target)}
            className="stroke-foreground [stroke-dasharray:3_2] [stroke-width:1.5]"
          />
          <text
            x={left - 8}
            y={by(target) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[11px] tabular-nums"
          >
            {target}
          </text>
        </svg>
        {chosen && (
          <ChartTip left={mid(chosen) + 16} bottom={bh - 4} width={width}>
            <span className="font-semibold">Week of {chosen.label}</span>
            <span className="flex items-center gap-2 tabular-nums">
              <span className="mx-1 size-2.5 rounded-[3px] bg-tc/40" aria-hidden />
              <span className="flex-1 text-muted-foreground">{barsLabel}</span>
              <span className="font-semibold">
                {chosen.value} / {target}
              </span>
            </span>
          </ChartTip>
        )}
      </div>
      {hover !== null && at[0] && (
        <ChartTip left={x(hover) + 12} top={0} width={width}>
          <span className="flex items-center gap-2 font-semibold">
            {at[0].title}
            {at.some((p) => p.mark) && <PrBadge />}
          </span>
          {lines.map((l) => {
            const p = l.points.find((q) => q.at === hover)
            return p ? (
              <span key={l.id} className="flex items-center gap-2 tabular-nums">
                <LineSample tone={l.tone} dash={l.dash} />
                <span className="flex-1 text-muted-foreground">{l.label}</span>
                <span className="font-semibold">{p.text}</span>
              </span>
            ) : null
          })}
        </ChartTip>
      )}
    </div>
  )
}
