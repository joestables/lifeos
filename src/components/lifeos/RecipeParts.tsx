import {
  ChefHatIcon,
  GripVerticalIcon,
  PackagePlusIcon,
  TypeIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TimerIcon,
  XIcon,
} from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Reorder } from '@/hooks/use-reorder'
import { LINE_UNITS } from './recipe-fields'
import { cn } from '@/lib/utils'

/** A line of a Recipe's ingredients: its amount and unit, then the ingredient. */
export interface IngredientLine {
  key: string
  /** "200 g", "1–2 tsp", "~5 g", "2"; none for an unmeasured line. */
  amount?: string
  name: string
  /** Kept as typed: not in the Pantry. */
  typed?: boolean
}

/** A subheading ("For the sauce") and the lines under it; the first group may have none. */
export interface IngredientGroup {
  heading?: string
  lines: IngredientLine[]
}

/**
 * A Variation's ingredients, to read (RCP-005): each line the ingredient,
 * then its amount at the end in tabular figures (Joe, 20 October); optional
 * subheadings. In Cooking the lines are larger; they aren't ticked off
 * (Joe, 18 October).
 */
export function IngredientList({
  groups,
  cooking = false,
}: {
  groups: IngredientGroup[]
  cooking?: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g, i) => (
        <div key={g.heading ?? i} className="flex flex-col gap-0.5">
          {g.heading && (
            <div className="pb-1 text-sm font-bold text-muted-foreground">{g.heading}</div>
          )}
          {g.lines.map((l) => (
            <div
              key={l.key}
              className={cn('flex items-baseline gap-3 py-1.5', cooking && 'py-2 text-base')}
            >
              <span className="min-w-0 flex-1">{l.name}</span>
              {l.amount && (
                <span className="shrink-0 text-right font-semibold tabular-nums">{l.amount}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Text with "@" references to other Recipes: each a reference the Recipe opens from. */
export type StepPart = string | { recipe: string; id?: string | null }

/** A step's or the notes' text, with any "@" references to other Recipes as buttons. */
export function RecipeText({
  parts,
  onRecipe,
}: {
  parts: StepPart[]
  onRecipe?: (reference: { recipe: string; id?: string | null }) => void
}) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i} className="whitespace-pre-wrap">
            {p}
          </span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onRecipe?.(p)}
            className="mx-0.5 inline-flex h-6 translate-y-[-1px] items-center gap-1 rounded-sm bg-selected px-1.5 align-middle text-sm font-semibold text-selected-foreground outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-3.5"
          >
            <ChefHatIcon aria-hidden />
            {p.recipe}
          </button>
        ),
      )}
    </>
  )
}

/**
 * A Variation's method (RCP-008): numbered steps. In Cooking the text is
 * larger, a step can be ticked off, and one that names a time offers its
 * timer.
 */
export function MethodSteps({
  steps,
  cooking = false,
  done = [],
  current,
  onRecipe,
  onStep,
}: {
  steps: { key: string; parts: StepPart[]; timer?: ReactNode }[]
  cooking?: boolean
  done?: string[]
  /** In Cooking: the step I'm on. */
  current?: string
  onRecipe?: (reference: { recipe: string; id?: string | null }) => void
  /** In Cooking: choosing the step I'm on, by its number. */
  onStep?: (key: string) => void
}) {
  return (
    <ol className={cn('flex flex-col', cooking ? 'gap-2' : 'gap-4')}>
      {steps.map((s, i) => {
        const isDone = done.includes(s.key)
        const number = cn(
          'grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums',
          cooking && 'mt-0.5 size-7 text-sm',
          isDone && 'bg-selected text-selected-foreground',
        )
        return (
          <li key={s.key} className={cn('flex gap-3', cooking && 'rounded-row px-3 py-3')}>
            {onStep ? (
              <button
                type="button"
                aria-label={`I'm on step ${i + 1}`}
                aria-current={s.key === current ? 'step' : undefined}
                onClick={() => onStep(s.key)}
                className={cn(
                  number,
                  'outline-none focus-visible:ring-3 focus-visible:ring-ring-soft',
                )}
              >
                {i + 1}
              </button>
            ) : (
              <span className={number}>{i + 1}</span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p
                className={cn(
                  'leading-[1.6]',
                  cooking && 'text-[17px] leading-[1.55]',
                  isDone && 'text-muted-foreground',
                )}
              >
                <RecipeText parts={s.parts} onRecipe={onRecipe} />
              </p>
              {s.timer}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A row's grip: drags it to its place (useReorder); none on a phone. */
function Handle({
  reorder,
  className,
  phone = false,
}: {
  reorder?: Reorder
  className?: string
  /** Shown on a phone too, where it is dragged by touch (ingredient lines). */
  phone?: boolean
}) {
  return (
    <span
      {...reorder?.handle}
      aria-hidden
      className={cn(
        'shrink-0 cursor-grab touch-none text-muted-foreground select-none [-webkit-touch-callout:none] [&_svg]:size-4',
        phone ? 'max-sm:opacity-100 sm:opacity-0' : 'opacity-0 max-sm:hidden',
        className,
      )}
    >
      <GripVerticalIcon />
    </span>
  )
}

const rowState = (reorder?: Reorder) => ({
  'data-reorder-id': reorder?.id,
  'data-reorder': reorder?.state,
})

const ROW =
  'rounded-control data-[reorder=dragging]:opacity-50 data-[reorder=over]:ring-2 data-[reorder=over]:ring-ring'

/**
 * A step being edited: its number, its text in an
 * `--input` box, and Remove. `field` replaces the box when it carries the
 * "@" suggestions (a Popover's trigger).
 */
export function StepEditor({
  n,
  text,
  field,
  reorder,
  onRemove,
}: {
  n: number
  /** The text, to show (the design page). */
  text?: ReactNode
  field?: ReactNode
  reorder?: Reorder
  onRemove?: () => void
}) {
  return (
    <div {...rowState(reorder)} className={cn('group/step flex items-start gap-2', ROW)}>
      {reorder && <Handle reorder={reorder} className="mt-2.5 group-hover/step:opacity-100" />}
      <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">
        {n}
      </span>
      {field ?? (
        <div className="min-w-0 flex-1 rounded-control bg-input px-3 py-2 leading-[1.6]">
          {text}
        </div>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove step ${n}`}
          onClick={onRemove}
          className="mt-1 shrink-0 group-hover/step:opacity-100 focus-visible:opacity-100 sm:opacity-0"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}

/**
 * A Cooking timer (RCP-011): offered on a step that names a time ("Start
 * 20:00"), then counting down, then done.
 */
export function TimerChip({
  label,
  time,
  state = 'offered',
  onStart,
  onStop,
  onPause,
  onResume,
}: {
  /** "Simmer" */
  label?: string
  /** "20:00", "12:34" */
  time: string
  state?: 'offered' | 'running' | 'paused' | 'done'
  onStart?: () => void
  onStop?: () => void
  onPause?: () => void
  onResume?: () => void
}) {
  if (state === 'offered')
    return (
      <Button variant="outline" size="sm" className="self-start tabular-nums" onClick={onStart}>
        <TimerIcon /> Start {time}
      </Button>
    )
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center gap-2 self-start rounded-full bg-selected pr-1 pl-3 text-sm font-semibold text-selected-foreground',
        state === 'done' && 'bg-primary text-primary-foreground',
      )}
    >
      <TimerIcon aria-hidden className="size-4" />
      {label && <span>{label}</span>}
      <span className="text-base font-bold tabular-nums">{state === 'done' ? 'Done' : time}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7 rounded-full text-current hover:bg-foreground/10"
        aria-label={state === 'running' ? 'Pause' : 'Resume'}
        disabled={state === 'done'}
        onClick={state === 'running' ? onPause : onResume}
      >
        {state === 'running' ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7 rounded-full text-current hover:bg-foreground/10"
        aria-label="Stop timer"
        onClick={onStop}
      >
        <XIcon />
      </Button>
    </div>
  )
}

/** Servings in Cooking: − 4 +, scaling the ingredients. */
export function ServingsStepper({
  value,
  onChange,
}: {
  value: number
  onChange?: (value: number) => void
}) {
  return (
    <div className="inline-flex h-10 items-center gap-1 rounded-control bg-muted p-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Fewer servings"
        disabled={value <= 1}
        onClick={() => onChange?.(value - 1)}
      >
        <MinusIcon />
      </Button>
      <span
        className="min-w-[88px] text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        Serves {value}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="More servings"
        onClick={() => onChange?.(value + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

/**
 * An entry in a Recipe's log (RCP-013): who, what happened, when; a cook
 * with its verdict and notes, and a link to what was cooked.
 */
export function LogEntry({
  who,
  what,
  when,
  verdict,
  notes,
  children,
  menu,
}: {
  who: string
  /** "Cooked Air fryer", "Changed Air fryer" */
  what: string
  when: string
  verdict?: ReactNode
  notes?: string
  /** "What I cooked", a note. */
  children?: ReactNode
  /** My own entry's "…" (a note on an edit, how a cook went). */
  menu?: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5">
        <AvatarFallback>
          {who
            .split(' ')
            .map((w) => w[0])
            .join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold">{what}</span>
          <span className="text-muted-foreground">
            {who} · {when}
          </span>
        </div>
        {verdict}
        {notes && <p className="text-sm leading-[1.5]">{notes}</p>}
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
      </div>
      {menu && <div className="-mt-1 shrink-0">{menu}</div>}
    </div>
  )
}

/** A Card of a Recipe's page: its heading (`text-h2`) and an action at its end. */
export function RecipePanel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="gap-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-h2">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

/**
 * A Recipe's Cards side by side on a computer, stacked on a phone: to read
 * (ingredients, a wider method, notes and log), Cooking (ingredients, a
 * wider method) and editing (ingredients a little wider than the method).
 */
export function RecipeColumns({
  layout,
  children,
}: {
  layout: 'read' | 'cooking' | 'editing'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-4',
        layout === 'read' && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]',
        layout === 'cooking' && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]',
        layout === 'editing' && 'lg:grid-cols-2',
      )}
    >
      {children}
    </div>
  )
}

/**
 * A Variation's own fields being edited, in one Card: in a row on a
 * computer (the name widest, then four, then Done); on a phone two across,
 * the name the whole width (Joe, 20 October).
 */
export function VariationFieldsCard({ children }: { children: ReactNode }) {
  return (
    <Card className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto] sm:gap-4">
      {children}
    </Card>
  )
}

/**
 * A Recipe's heading laid out: on a computer the photo (288px) beside the
 * details and, under them, the actions; on a phone the photo at about half
 * the width beside the details, the actions the whole width under both
 * (Joe, 20 October).
 */
export function RecipeHeadingLayout({
  photo,
  details,
  actions,
}: {
  photo: ReactNode
  details: ReactNode
  actions: ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(0,44%)_minmax(0,1fr)] items-start gap-x-4 gap-y-4 [grid-template-areas:'photo_details''actions_actions'] md:grid-cols-[18rem_minmax(0,1fr)] md:gap-x-5 md:gap-y-3 md:[grid-template-areas:'photo_details''photo_actions']">
      <div className="[grid-area:photo]">{photo}</div>
      <div className="flex min-w-0 flex-col gap-2 [grid-area:details] md:gap-3">{details}</div>
      <div className="flex flex-wrap items-center gap-2 [grid-area:actions]">{actions}</div>
    </div>
  )
}

/** A fact about a Recipe in its heading: category, cuisine, a tag. */
export function RecipeFact({ children }: { children: ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>
}

const UNITS = LINE_UNITS

/**
 * An ingredient line being edited (RCP-007), on one line on a phone and a
 * computer (Joe, 20 October): a handle to reorder it, the ingredient (with
 * whether it is in the Pantry), then the amount and the unit, each its own
 * box, and Remove. The ingredient box suggests Pantry entries as I type.
 * Given handlers, each box is kept as typed; without, it only shows (the
 * design page).
 */
export function IngredientLineEditor({
  amount,
  unit,
  ingredient,
  status = 'pantry',
  ingredientField,
  reorder,
  onAmount,
  onAmountDone,
  onUnit,
  onRemove,
  onKeyDown,
  onAddToPantry,
}: {
  amount?: string
  unit?: (typeof UNITS)[number]
  ingredient: string
  /**
   * In the Pantry (no mark: Joe, 24 October), kept as typed, or still being
   * typed.
   */
  status?: 'pantry' | 'typed' | 'typing'
  /** The ingredient box, when it carries its suggestions (a Popover's trigger). */
  ingredientField?: ReactNode
  reorder?: Reorder
  onAmount?: (amount: string) => void
  /** Leaving the amount: it is read and kept. */
  onAmountDone?: () => void
  onUnit?: (unit: (typeof UNITS)[number]) => void
  onRemove?: () => void
  /** On any of its boxes: Alt+↑ / Alt+↓ move the line. */
  onKeyDown?: (e: KeyboardEvent) => void
  /** Kept as typed: its mark is a button adding it to the Pantry (PAN-004 1). */
  onAddToPantry?: () => void
}) {
  return (
    <div
      {...rowState(reorder)}
      onKeyDown={onKeyDown}
      className={cn('group/line flex items-center gap-1.5 sm:gap-2', ROW)}
    >
      {reorder && <Handle phone reorder={reorder} className="group-hover/line:opacity-100" />}
      <div className="relative min-w-0 flex-1">
        {ingredientField ?? (
          <Input aria-label="Ingredient" defaultValue={ingredient} className="pr-8" />
        )}
        {status === 'typed' && onAddToPantry && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Add ${ingredient} to the Pantry`}
            title="Kept as typed: add to the Pantry"
            onClick={onAddToPantry}
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground"
          >
            <PackagePlusIcon />
          </Button>
        )}
        {status === 'typed' && !onAddToPantry && (
          <span
            title="Kept as typed"
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"
          >
            <TypeIcon aria-label="Kept as typed" />
          </span>
        )}
      </div>
      <Input
        aria-label="Amount"
        {...(onAmount
          ? { value: amount ?? '', onChange: (e) => onAmount(e.target.value), onBlur: onAmountDone }
          : { defaultValue: amount })}
        inputMode="decimal"
        autoComplete="off"
        placeholder="—"
        className="w-12 shrink-0 px-2 text-right tabular-nums sm:w-[72px] sm:px-3"
      />
      <Select
        {...(onUnit
          ? {
              value: unit ?? '',
              onValueChange: (v: string | null) => onUnit((v ?? '') as (typeof UNITS)[number]),
            }
          : { defaultValue: unit ?? '' })}
      >
        <SelectTrigger aria-label="Unit" className="w-[78px] shrink-0 gap-1 px-2 sm:w-24 sm:px-3">
          <SelectValue>
            {(v: string) => v || <span className="text-muted-foreground">—</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {UNITS.map((u) => (
            <SelectItem key={u || 'none'} value={u}>
              {u || 'No unit'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={ingredient ? `Remove ${ingredient}` : 'Remove'}
        onClick={onRemove}
        className="shrink-0 group-hover/line:opacity-100 focus-visible:opacity-100 sm:opacity-0"
      >
        <XIcon />
      </Button>
    </div>
  )
}

/**
 * A subheading among the lines being edited ("For the sauce"): set as it
 * reads, a 14px bold muted heading over the lines that follow, with a line
 * under it, typed into in place; a handle and Remove as a line's.
 */
export function SubheadingEditor({
  value,
  reorder,
  onChange,
  onDone,
  onRemove,
  onKeyDown,
}: {
  value: string
  reorder?: Reorder
  onChange?: (value: string) => void
  onDone?: () => void
  onRemove?: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}) {
  return (
    <div
      {...rowState(reorder)}
      onKeyDown={onKeyDown}
      className={cn('group/line flex items-center gap-1.5 pt-3 sm:gap-2', ROW)}
    >
      <Handle phone reorder={reorder} className="group-hover/line:opacity-100" />
      <input
        aria-label="Subheading"
        autoComplete="off"
        placeholder="Subheading"
        {...(onChange
          ? { value, onChange: (e) => onChange(e.target.value), onBlur: onDone }
          : { defaultValue: value })}
        className="h-9 min-w-0 flex-1 border-b border-border bg-transparent text-sm font-bold text-muted-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:text-foreground"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={value ? `Remove ${value}` : 'Remove subheading'}
        onClick={onRemove}
        className="shrink-0 group-hover/line:opacity-100 focus-visible:opacity-100 sm:opacity-0"
      >
        <XIcon />
      </Button>
    </div>
  )
}
