import {
  ChevronDownIcon,
  GripVerticalIcon,
  MinusIcon,
  PlusIcon,
  TrophyIcon,
  XIcon,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { readinessColour } from './readiness'

/* ---------- Readiness ---------- */

/** The readiness scale itself, 0 to 100, for a key under the body map. */
export function ReadinessScale({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="h-2 rounded-full bg-[linear-gradient(to_right,var(--destructive),var(--warning),var(--success))]" />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>0 %</span>
        <span>50 %</span>
        <span>100 %</span>
      </div>
    </div>
  )
}

/** A muscle group's readiness: a bar in its colour on the scale, and the percentage. */
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

/** A muscle group's name beside its ReadinessBar, in a list by category (GYM-016 2). */
export function MuscleReadiness({ muscle, percent }: { muscle: string; percent: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3">
      <span className="truncate text-sm font-semibold">{muscle}</span>
      <ReadinessBar percent={percent} />
    </div>
  )
}

/** Overall readiness (GYM-016 1): the percentage as a page title is set, and its name. */
export function OverallReadiness({ percent }: { percent: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-h1 tabular-nums">{percent} %</span>
      <span className="text-sm text-muted-foreground">Overall readiness</span>
    </div>
  )
}

/**
 * A Gym page's two columns on a computer (a review, a template): the main
 * one, and a narrower one beside it (360px) for stimulus sets or coverage;
 * stacked on a phone.
 */
export function SideColumns({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">{children}</div>
}

/* ---------- The body map ---------- */

type Shape =
  | { e: [number, number, number, number] }
  | { r: [number, number, number, number, number] }
  | { p: string }

/** Each built-in muscle group's place on the front and the back (GYM-002). */
const MUSCLE_SHAPES: { muscle: string; view: 'front' | 'back'; shapes: Shape[] }[] = [
  {
    muscle: 'Traps',
    view: 'front',
    shapes: [{ p: 'M60,55 L72,45 L73,54 Z' }, { p: 'M100,55 L88,45 L87,54 Z' }],
  },
  {
    muscle: 'Front delts',
    view: 'front',
    shapes: [{ e: [51, 66, 8, 11] }, { e: [109, 66, 8, 11] }],
  },
  {
    muscle: 'Lateral delts',
    view: 'front',
    shapes: [{ e: [42, 64, 5, 10] }, { e: [118, 64, 5, 10] }],
  },
  {
    muscle: 'Chest',
    view: 'front',
    shapes: [{ r: [59, 55, 20, 27, 8] }, { r: [81, 55, 20, 27, 8] }],
  },
  {
    muscle: 'Biceps',
    view: 'front',
    shapes: [{ e: [45, 96, 6.5, 15] }, { e: [115, 96, 6.5, 15] }],
  },
  {
    muscle: 'Brachialis',
    view: 'front',
    shapes: [{ e: [37.5, 104, 3, 9] }, { e: [122.5, 104, 3, 9] }],
  },
  {
    muscle: 'Forearms',
    view: 'front',
    shapes: [{ e: [41, 138, 6.5, 19] }, { e: [119, 138, 6.5, 19] }],
  },
  { muscle: 'Abs', view: 'front', shapes: [{ r: [70, 86, 20, 50, 6] }] },
  {
    muscle: 'Obliques',
    view: 'front',
    shapes: [{ r: [59, 88, 9, 42, 4.5] }, { r: [92, 88, 9, 42, 4.5] }],
  },
  {
    muscle: 'Abductors',
    view: 'front',
    shapes: [{ e: [58, 152, 4.5, 10] }, { e: [102, 152, 4.5, 10] }],
  },
  {
    muscle: 'Quads',
    view: 'front',
    shapes: [{ e: [67, 194, 9.5, 33] }, { e: [93, 194, 9.5, 33] }],
  },
  {
    muscle: 'Adductors',
    view: 'front',
    shapes: [{ e: [77.5, 178, 3, 17] }, { e: [82.5, 178, 3, 17] }],
  },
  {
    muscle: 'Tibialis',
    view: 'front',
    shapes: [{ e: [65, 268, 4.5, 23] }, { e: [95, 268, 4.5, 23] }],
  },
  { muscle: 'Traps', view: 'back', shapes: [{ p: 'M80,44 L61,58 L80,94 L99,58 Z' }] },
  { muscle: 'Rear delts', view: 'back', shapes: [{ e: [51, 66, 8, 11] }, { e: [109, 66, 8, 11] }] },
  {
    muscle: 'Lateral delts',
    view: 'back',
    shapes: [{ e: [42, 64, 5, 10] }, { e: [118, 64, 5, 10] }],
  },
  {
    muscle: 'Lats',
    view: 'back',
    shapes: [{ p: 'M60,72 L76,96 L73,124 L61,106 Z' }, { p: 'M100,72 L84,96 L87,124 L99,106 Z' }],
  },
  {
    muscle: 'Erectors',
    view: 'back',
    shapes: [{ r: [74, 96, 5, 44, 2.5] }, { r: [81, 96, 5, 44, 2.5] }],
  },
  {
    muscle: 'Triceps',
    view: 'back',
    shapes: [{ e: [44, 96, 6.5, 15] }, { e: [116, 96, 6.5, 15] }],
  },
  {
    muscle: 'Forearms',
    view: 'back',
    shapes: [{ e: [41, 138, 6.5, 19] }, { e: [119, 138, 6.5, 19] }],
  },
  {
    muscle: 'Glutes',
    view: 'back',
    shapes: [{ e: [70, 156, 10.5, 12.5] }, { e: [90, 156, 10.5, 12.5] }],
  },
  {
    muscle: 'Abductors',
    view: 'back',
    shapes: [{ e: [57, 149, 4.5, 10] }, { e: [103, 149, 4.5, 10] }],
  },
  {
    muscle: 'Hamstrings',
    view: 'back',
    shapes: [{ e: [68, 202, 9.5, 28] }, { e: [92, 202, 9.5, 28] }],
  },
  {
    muscle: 'Adductors',
    view: 'back',
    shapes: [{ e: [78, 186, 2.8, 14] }, { e: [82, 186, 2.8, 14] }],
  },
  {
    muscle: 'Calves',
    view: 'back',
    shapes: [{ e: [66, 266, 7.5, 22] }, { e: [94, 266, 7.5, 22] }],
  },
]

/** The figure the muscles sit on, in the muted fill. */
const BODY: Shape[] = [
  { e: [80, 24, 13, 16] },
  { r: [73, 38, 14, 12, 4] },
  { r: [55, 48, 50, 98, 18] },
  { r: [58, 136, 44, 26, 10] },
  { r: [34, 54, 18, 70, 9] },
  { r: [108, 54, 18, 70, 9] },
  { r: [33, 114, 16, 50, 8] },
  { r: [111, 114, 16, 50, 8] },
  { e: [40, 168, 6, 7] },
  { e: [120, 168, 6, 7] },
  { r: [56, 156, 23, 82, 11] },
  { r: [81, 156, 23, 82, 11] },
  { r: [57, 236, 17, 62, 8] },
  { r: [86, 236, 17, 62, 8] },
  { e: [65, 302, 8, 5] },
  { e: [95, 302, 8, 5] },
]

function ShapeEl({ shape, ...props }: { shape: Shape } & React.SVGProps<SVGElement>) {
  if ('e' in shape) {
    const [cx, cy, rx, ry] = shape.e
    return (
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...(props as React.SVGProps<SVGEllipseElement>)} />
    )
  }
  if ('r' in shape) {
    const [x, y, width, height, r] = shape.r
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={r}
        {...(props as React.SVGProps<SVGRectElement>)}
      />
    )
  }
  return <path d={shape.p} {...(props as React.SVGProps<SVGPathElement>)} />
}

/**
 * The body map (GYM-016): the built-in muscle groups, front and back, each
 * filled with its readiness on the continuous scale. A muscle is a button:
 * choosing it opens its readiness. Groups of my own aren't on it.
 */
export function BodyMap({
  readiness,
  selected,
  onSelect,
  className,
}: {
  readiness: Record<string, number>
  selected?: string
  onSelect?: (muscle: string) => void
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      {(['front', 'back'] as const).map((view) => (
        <figure key={view} className="flex flex-col items-center gap-1">
          <svg
            viewBox="22 4 116 306"
            className="h-auto w-full max-w-[180px]"
            role="group"
            aria-label={view === 'front' ? 'Front' : 'Back'}
          >
            {BODY.map((s, i) => (
              <ShapeEl key={i} shape={s} className="fill-muted" />
            ))}
            {MUSCLE_SHAPES.filter((m) => m.view === view).map((m) => {
              const p = readiness[m.muscle] ?? 100
              const on = selected === m.muscle
              return (
                <g
                  key={m.muscle}
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.muscle} ${p} %`}
                  onClick={() => onSelect?.(m.muscle)}
                  className="cursor-pointer outline-none [&:focus-visible>*]:stroke-ring"
                >
                  <title>{`${m.muscle} · ${p} %`}</title>
                  {m.shapes.map((s, i) => (
                    <ShapeEl
                      key={i}
                      shape={s}
                      // Its colour on the readiness scale.
                      style={{ fill: readinessColour(p) }}
                      className={cn(
                        'stroke-card transition-opacity hover:opacity-80',
                        on ? 'stroke-foreground [stroke-width:1.5]' : '[stroke-width:1]',
                      )}
                    />
                  ))}
                </g>
              )
            })}
          </svg>
          <figcaption className="text-xs font-semibold text-muted-foreground">
            {view === 'front' ? 'Front' : 'Back'}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/* ---------- Steppers and sets ---------- */

/**
 * A value moved by − and +, or typed: a `--muted` box with ghost buttons.
 * `compact`, in a set's row: 28px buttons, so weight, reps and RIR fit a
 * phone's width.
 */
export function ValueStepper({
  value,
  label,
  onStep,
  canDown = true,
  width = 'md',
  compact = false,
}: {
  value: string
  /** What it changes ("Weight"): its buttons say "Less weight", "More weight". */
  label: string
  onStep?: (direction: -1 | 1) => void
  canDown?: boolean
  width?: 'sm' | 'md' | 'lg'
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center rounded-control bg-muted',
        compact ? 'h-8 gap-0 p-0.5' : 'h-10 gap-1 p-1',
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Less ${label.toLowerCase()}`}
        disabled={!canDown}
        onClick={() => onStep?.(-1)}
        className={cn(compact && 'size-7 [&_svg]:size-3.5')}
      >
        <MinusIcon />
      </Button>
      <span
        aria-label={label}
        aria-live="polite"
        className={cn(
          'text-center text-sm font-semibold tabular-nums',
          width === 'sm' && 'w-6',
          width === 'md' && 'w-8',
          width === 'lg' && 'w-12',
        )}
      >
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`More ${label.toLowerCase()}`}
        onClick={() => onStep?.(1)}
        className={cn(compact && 'size-7 [&_svg]:size-3.5')}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

/** The heads over a column of SetRows: Set, kg, Reps, RIR. */
export function SetHeads() {
  return (
    <div className="flex items-center gap-1 px-1 text-xs font-semibold text-muted-foreground sm:gap-2">
      <span className="w-5 text-center">Set</span>
      <span className="w-[100px] text-center sm:w-[108px]">kg</span>
      <span className="w-[82px] text-center sm:w-[90px]">Reps</span>
      <span className="w-[78px] text-center sm:w-[86px]">RIR</span>
    </div>
  )
}

/**
 * A set in a workout (GYM-010): its number, weight, reps and RIR as
 * compact ValueSteppers, then a Checkbox in the Gym's coral that logs it. A
 * logged set that is the best Epley strength yet carries a trophy.
 */
export function SetRow({
  n,
  weight,
  reps,
  rir,
  logged = false,
  pr = false,
  onRemove,
}: {
  n: number
  weight: string
  reps: number
  rir: number
  logged?: boolean
  pr?: boolean
  onRemove?: () => void
}) {
  return (
    <div
      data-logged={logged || undefined}
      className="flex items-center gap-1 rounded-control px-1 py-0.5 sm:gap-2"
    >
      <span className="grid w-5 shrink-0 place-items-center text-sm font-semibold text-muted-foreground tabular-nums">
        {pr ? <TrophyIcon aria-label="PR" className="size-3.5 text-tc-text" /> : n}
      </span>
      <ValueStepper compact width="lg" label="Weight" value={weight} />
      <ValueStepper compact width="md" label="Reps" value={String(reps)} />
      <ValueStepper compact width="sm" label="RIR" value={String(rir)} canDown={rir > 0} />
      <span className="grid size-8 place-items-center">
        <Checkbox colour="coral" checked={logged} aria-label={`Log set ${n}`} />
      </span>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove set ${n}`}
          onClick={onRemove}
          className="max-sm:hidden"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}

/**
 * An exercise in a workout (GYM-008): a header — its name, a muted line
 * (primary group, sets done of planned, best set), a Done button and the
 * chevron that expands or collapses it — then, expanded, its sets. A done
 * exercise's name is muted with a tick.
 */
export function ExerciseBlock({
  name,
  meta,
  open = false,
  done = false,
  menu,
  action,
  children,
}: {
  name: string
  meta: ReactNode
  open?: boolean
  done?: boolean
  menu?: ReactNode
  /** Done, or Undo done. */
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <section
      data-open={open || undefined}
      className="flex flex-col rounded-row bg-card shadow-card"
    >
      <div className="flex min-h-14 items-center gap-2 py-2 pr-2 pl-3.5">
        <button
          type="button"
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn('truncate font-semibold', done && 'text-muted-foreground')}>
              {name}
            </span>
            <span className="truncate text-sm text-muted-foreground tabular-nums">{meta}</span>
          </span>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {action}
        {menu}
      </div>
      {open && <div className="flex flex-col gap-1.5 px-2.5 pb-3 sm:px-3.5">{children}</div>}
    </section>
  )
}

/**
 * A row to reorder in a template (GYM-006): a drag handle, the exercise's
 * name and its primary group, its sets each with an RIR stepper, Add set,
 * and an X that takes it off the template.
 */
export function TemplateExercise({
  name,
  meta,
  rirs,
  onRemove,
}: {
  name: string
  meta: string
  rirs: number[]
  onRemove?: () => void
}) {
  return (
    <section className="flex flex-col gap-2 rounded-row bg-card p-3 shadow-card">
      <div className="flex items-center gap-2">
        <GripVerticalIcon
          aria-label="Drag to reorder"
          className="size-4 shrink-0 cursor-grab text-muted-foreground"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-sm text-muted-foreground">{meta}</span>
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={`Take ${name} off`} onClick={onRemove}>
          <XIcon />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-6">
        {rirs.map((rir, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              Set {i + 1} · RIR
            </span>
            <ValueStepper compact width="sm" label="RIR" value={String(rir)} canDown={rir > 0} />
          </span>
        ))}
        <Button variant="ghost" size="sm">
          <PlusIcon /> Set
        </Button>
      </div>
    </section>
  )
}

/* ---------- Coverage and targets ---------- */

/**
 * Stimulus sets against a target (GYM-006 4, GYM-017): the muscle group's
 * name, a bar filled to the sets (the target marked as a tick), and
 * "3.2 / 4". Over the target, the bar is full.
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

/* ---------- Charts ---------- */

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

export type ChartLine = {
  id: string
  label: string
  values: (number | null)[]
  /** strong: the Gym's coral, 2px; dash: coral, dashed; muted: grey, 1.5px. */
  style: 'strong' | 'dash' | 'dot' | 'muted'
  /** A marker on one point (the PR). */
  mark?: number
}

/**
 * Progression over time (GYM-014, GYM-015): one axis only, Epley strength
 * (or its change, %) by week, with a crosshair and the values on hover; and,
 * under it on the same weeks, the muscle group's weekly stimulus sets as
 * bars with its target as a dashed line — two panels, never a second axis.
 */
export function ProgressChart({
  weeks,
  lines,
  refs = [],
  bars,
  target,
  barsLabel,
  unit = '',
}: {
  weeks: string[]
  lines: ChartLine[]
  /** Flat lines with a label (the goal). */
  refs?: { label: string; value: number }[]
  bars: number[]
  target: number
  barsLabel: string
  unit?: string
}) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const left = 40
  const right = 12
  const h = 180
  const bh = 96
  const all = [
    ...lines.flatMap((l) => l.values.filter((v): v is number => v !== null)),
    ...refs.map((r) => r.value),
  ]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const pad = (hi - lo) * 0.12 || 1
  const y0 = lo - pad
  const y1 = hi + pad
  const n = weeks.length
  const x = (i: number) => left + ((width - left - right) * i) / Math.max(1, n - 1)
  const y = (v: number) => 8 + (h - 24) * (1 - (v - y0) / (y1 - y0))
  const raw = (y1 - y0) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const tick = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((t) => t >= raw) ?? raw
  const ticks: number[] = []
  for (let t = Math.ceil(y0 / tick) * tick; t <= y1; t += tick) ticks.push(t)
  const bmax = Math.max(target * 1.5, ...bars)
  const by = (v: number) => bh - 14 - ((bh - 20) * v) / bmax
  const step = (width - left - right) / Math.max(1, n - 1)
  const fmt = (v: number) => `${Math.round(v * 10) / 10}${unit}`

  return (
    <div ref={ref} className="relative flex w-full flex-col gap-1">
      <svg
        width={width}
        height={h}
        className="overflow-visible"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const i = Math.round((e.clientX - rect.left - left) / step)
          setHover(i >= 0 && i < n ? i : null)
        }}
        onPointerLeave={() => setHover(null)}
      >
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
              x={left - 6}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        {refs.map((r) => (
          <g key={r.label}>
            <line
              x1={left}
              x2={width - right}
              y1={y(r.value)}
              y2={y(r.value)}
              className="stroke-muted-foreground [stroke-dasharray:2_4] [stroke-width:1.5]"
            />
            <text
              x={width - right}
              y={y(r.value) - 5}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] font-semibold"
            >
              {r.label}
            </text>
          </g>
        ))}
        {lines.map((l) => {
          let d = ''
          l.values.forEach((v, i) => {
            if (v === null) return
            d += `${d === '' ? 'M' : 'L'}${x(i)},${y(v)}`
          })
          return (
            <g key={l.id}>
              <path
                d={d}
                fill="none"
                className={cn(
                  '[stroke-linecap:round] [stroke-linejoin:round]',
                  l.style === 'muted'
                    ? 'stroke-muted-foreground [stroke-width:1.5]'
                    : 'stroke-tc [stroke-width:2]',
                  l.style === 'dash' && '[stroke-dasharray:6_4]',
                  l.style === 'dot' && '[stroke-dasharray:1_4]',
                )}
              />
              {l.mark !== undefined && l.values[l.mark] !== null && (
                <circle
                  cx={x(l.mark)}
                  cy={y(l.values[l.mark]!)}
                  r={5}
                  className="fill-tc stroke-card [stroke-width:2]"
                />
              )}
            </g>
          )
        })}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={4} y2={h - 16} className="stroke-foreground/25" />
        )}
        {weeks.map((w, i) =>
          i % Math.ceil(n / Math.max(2, Math.floor(width / 80))) === 0 ? (
            <text
              key={w + i}
              x={x(i)}
              y={h - 2}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {w}
            </text>
          ) : null,
        )}
      </svg>
      <div className="pl-10 text-xs font-semibold text-muted-foreground">{barsLabel}</div>
      <svg width={width} height={bh} className="overflow-visible">
        {bars.map((b, i) => (
          <rect
            key={i}
            x={x(i) - Math.min(10, step * 0.35)}
            y={by(b)}
            width={Math.min(20, step * 0.7)}
            height={Math.max(0, bh - 14 - by(b))}
            rx={3}
            className={cn('fill-tc/45', hover === i && 'fill-tc/80')}
          />
        ))}
        <line
          x1={left}
          x2={width - right}
          y1={by(target)}
          y2={by(target)}
          className="stroke-foreground [stroke-dasharray:4_3] [stroke-width:1.5]"
        />
        <text
          x={left - 6}
          y={by(target) + 4}
          textAnchor="end"
          className="fill-muted-foreground text-[11px] tabular-nums"
        >
          {target}
        </text>
        <line
          x1={left}
          x2={width - right}
          y1={bh - 14}
          y2={bh - 14}
          className="stroke-foreground/12"
        />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 flex min-w-36 flex-col gap-0.5 rounded-sm bg-popover p-2.5 text-xs shadow-pop"
          // Beside the crosshair.
          style={{ left: Math.min(x(hover) + 10, width - 160) }}
        >
          <span className="font-semibold">Week of {weeks[hover]}</span>
          {lines.map((l) =>
            l.values[hover] === null ? null : (
              <span key={l.id} className="flex justify-between gap-3 tabular-nums">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="font-semibold">{fmt(l.values[hover]!)}</span>
              </span>
            ),
          )}
          <span className="flex justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">Stimulus sets</span>
            <span className="font-semibold">{bars[hover]}</span>
          </span>
        </div>
      )}
    </div>
  )
}

/** A chart's key: each line's stroke beside its name, in text colours. */
export function ChartKey({
  items,
}: {
  items: { label: string; style: ChartLine['style'] | 'ref' | 'bar' }[]
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden>
            {it.style === 'bar' ? (
              <rect x="5" y="0" width="8" height="8" rx="2" className="fill-tc/45" />
            ) : (
              <line
                x1="1"
                x2="17"
                y1="4"
                y2="4"
                className={cn(
                  '[stroke-linecap:round]',
                  it.style === 'muted' || it.style === 'ref'
                    ? 'stroke-muted-foreground'
                    : 'stroke-tc',
                  it.style === 'muted' ? '[stroke-width:1.5]' : '[stroke-width:2]',
                  it.style === 'dash' && '[stroke-dasharray:5_3]',
                  it.style === 'dot' && '[stroke-dasharray:1_3]',
                  it.style === 'ref' && '[stroke-dasharray:2_3]',
                )}
              />
            )}
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}
