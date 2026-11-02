import { cn } from '@/lib/utils'
import { readinessColour } from './readiness'

/*
 * The body map is a stand-in, to be replaced by a figure rendered from an
 * anatomical model (Joe, 3 November; ADR-0060, Proposed; gym.md, Recovery).
 */

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
            className="h-auto w-full max-w-[150px] sm:max-w-[180px]"
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
