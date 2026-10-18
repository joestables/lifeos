import {
  ChefHatIcon,
  GripVerticalIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TimerIcon,
  XIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
 * A Variation's ingredients, to read (RCP-005): each line its amount in
 * tabular figures, then the ingredient; optional subheadings. In Cooking,
 * each line has a checkbox to tick off.
 */
export function IngredientList({
  groups,
  cooking = false,
  ticked = [],
}: {
  groups: IngredientGroup[]
  cooking?: boolean
  ticked?: string[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g, i) => (
        <div key={g.heading ?? i} className="flex flex-col gap-0.5">
          {g.heading && (
            <div className="pb-1 text-sm font-bold text-muted-foreground">{g.heading}</div>
          )}
          {g.lines.map((l) => {
            const done = ticked.includes(l.key)
            return (
              <label
                key={l.key}
                className={cn(
                  'flex items-baseline gap-3 py-1.5',
                  cooking && 'cursor-pointer items-center py-2 text-base',
                )}
              >
                {cooking && <Checkbox colour="green" defaultChecked={done} aria-label={l.name} />}
                <span
                  className={cn(
                    'w-16 shrink-0 font-semibold tabular-nums',
                    cooking && 'w-20',
                    done && 'text-muted-foreground line-through',
                  )}
                >
                  {l.amount}
                </span>
                <span className={cn('min-w-0', done && 'text-muted-foreground line-through')}>
                  {l.name}
                </span>
              </label>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** A step's text, with any "@" references to other Recipes as buttons. */
export type StepPart = string | { recipe: string }

function StepText({ parts, onRecipe }: { parts: StepPart[]; onRecipe?: (name: string) => void }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onRecipe?.(p.recipe)}
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
}: {
  steps: { key: string; parts: StepPart[]; timer?: ReactNode }[]
  cooking?: boolean
  done?: string[]
  /** In Cooking: the step I'm on. */
  current?: string
  onRecipe?: (name: string) => void
}) {
  return (
    <ol className={cn('flex flex-col', cooking ? 'gap-2' : 'gap-4')}>
      {steps.map((s, i) => {
        const isDone = done.includes(s.key)
        return (
          <li
            key={s.key}
            className={cn(
              'flex gap-3',
              cooking && 'rounded-row px-3 py-3',
              cooking && s.key === current && 'bg-accent',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums',
                cooking && 'mt-0.5 size-7 text-sm',
                isDone && 'bg-selected text-selected-foreground',
              )}
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p
                className={cn(
                  'leading-[1.6]',
                  cooking && 'text-[17px] leading-[1.55]',
                  isDone && 'text-muted-foreground',
                )}
              >
                <StepText parts={s.parts} onRecipe={onRecipe} />
              </p>
              {s.timer}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A step being edited: its number, its text, a handle to reorder it. */
export function StepEditor({ n, text }: { n: number; text: ReactNode }) {
  return (
    <div className="group/step flex items-start gap-2">
      <GripVerticalIcon
        aria-hidden
        className="mt-2.5 size-4 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover/step:opacity-100"
      />
      <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">
        {n}
      </span>
      <div className="min-w-0 flex-1 rounded-control bg-input px-3 py-2 leading-[1.6]">{text}</div>
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
}: {
  /** "Simmer" */
  label?: string
  /** "20:00", "12:34" */
  time: string
  state?: 'offered' | 'running' | 'paused' | 'done'
  onStart?: () => void
  onStop?: () => void
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
export function ServingsStepper({ value }: { value: number }) {
  return (
    <div className="inline-flex h-10 items-center gap-1 rounded-control bg-muted p-1">
      <Button variant="ghost" size="icon-sm" aria-label="Fewer servings">
        <MinusIcon />
      </Button>
      <span className="min-w-[88px] text-center text-sm font-semibold tabular-nums">
        Serves {value}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="More servings">
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
}: {
  who: string
  /** "Cooked Air fryer", "Changed Air fryer" */
  what: string
  when: string
  verdict?: ReactNode
  notes?: string
  /** "What I cooked", a change summary. */
  children?: ReactNode
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
    </div>
  )
}

/** A fact about a Recipe in its heading: category, cuisine, a tag. */
export function RecipeFact({ children }: { children: ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>
}
