import { cn } from '@/lib/utils'
import manifest from '@/assets/body-map/manifest.json'
import { readinessColour } from './readiness'

/*
 * The body map is rendered from an anatomical model, not drawn (ADR-0060):
 * scripts/body-map/ turns Z-Anatomy's atlas into the layers in
 * src/assets/body-map/, and this colours them. Each view stacks, in order:
 * the body in --body-map-body, cut to the silhouette; each group's mask in
 * its readiness colour; the shading over both (multiply); the seams; the
 * shine (screen). The look is Joe's (components.md, BodyMap).
 */

type View = 'front' | 'back'
const VIEWS: View[] = ['front', 'back']

type Group = {
  home: View
  paths: Partial<Record<View, string>>
  area: Partial<Record<View, number>>
}
const MAP = manifest as unknown as {
  size: [number, number]
  views: Record<View, { masks: string[] }>
  groups: Record<string, Group>
}

/** The built-in groups' names, by their body_part (fitness.muscle_groups; never renamed). */
const NAMES: Record<string, string> = {
  chest: 'Chest',
  front_delts: 'Front delts',
  lateral_delts: 'Lateral delts',
  rear_delts: 'Rear delts',
  triceps: 'Triceps',
  lats: 'Lats',
  traps: 'Traps',
  biceps: 'Biceps',
  brachialis: 'Brachialis',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  erectors: 'Erectors',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  adductors: 'Adductors',
  abductors: 'Abductors',
  calves: 'Calves',
  tibialis: 'Tibialis',
}

const FILES = import.meta.glob<string>('/src/assets/body-map/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})
const file = (view: View, name: string) => FILES[`/src/assets/body-map/${view}/${name}.webp`]

/** A group this small (its share of the frame) gets a wider tap area (GYM-016 7). */
const SMALL = 0.005

function maskStyle(view: View, name: string): React.CSSProperties {
  const url = `url(${file(view, name)})`
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  }
}

const LAYER = 'pointer-events-none absolute inset-0 size-full select-none'

function Figure({
  view,
  readiness,
  selected,
  onSelect,
}: {
  view: View
  readiness: Record<string, number>
  selected?: string
  onSelect?: (muscle: string) => void
}) {
  const [width, height] = MAP.size
  const percent = (part: string) => readiness[NAMES[part]!] ?? 100
  // Big groups first, so a small one's wider tap area lies on top.
  const shapes = Object.entries(MAP.groups)
    .filter(([, g]) => g.paths[view])
    .sort(([, a], [, b]) => (b.area[view] ?? 0) - (a.area[view] ?? 0))
  return (
    <div className="relative isolate w-full" style={{ aspectRatio: `${width} / ${height}` }}>
      <div className={cn(LAYER, 'bg-(--body-map-body)')} style={maskStyle(view, 'silhouette')} />
      {MAP.views[view].masks.map((part) => (
        <div
          key={part}
          className={cn(
            LAYER,
            'transition-[background-color] duration-(--duration) motion-reduce:transition-none',
          )}
          style={{ ...maskStyle(view, part), backgroundColor: readinessColour(percent(part)) }}
        />
      ))}
      <img
        src={file(view, 'shade')}
        alt=""
        draggable={false}
        className={cn(
          LAYER,
          'mix-blend-multiply [filter:contrast(1.2)] dark:[filter:contrast(1.2)_brightness(1.08)]',
        )}
      />
      <div className={cn(LAYER, 'bg-(--body-map-seam)')} style={maskStyle(view, 'lines')} />
      <img
        src={file(view, 'gloss')}
        alt=""
        draggable={false}
        className={cn(LAYER, 'opacity-55 mix-blend-screen')}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 size-full overflow-visible"
        role="group"
        aria-label={view === 'front' ? 'Front' : 'Back'}
      >
        {shapes.map(([part, g]) => {
          const name = NAMES[part]!
          const p = percent(part)
          const home = g.home === view
          const on = selected === name
          const d = g.paths[view]!
          return (
            <g
              key={part}
              // One button per group, on the view it shows most; the other is a shape to tap.
              {...(home
                ? { role: 'button', tabIndex: 0, 'aria-label': `${name} ${p} %` }
                : { 'aria-hidden': true })}
              onClick={() => onSelect?.(name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect?.(name)
                }
              }}
              className="group/muscle cursor-pointer outline-none"
            >
              <title>{`${name} · ${p} %`}</title>
              <path
                d={d}
                className={cn(
                  'fill-transparent stroke-transparent [pointer-events:all]',
                  (g.area[view] ?? 0) < SMALL && '[stroke-width:14px]',
                )}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={d}
                className={cn(
                  'pointer-events-none fill-none [stroke-width:1.5px]',
                  on
                    ? 'stroke-foreground [stroke-width:2px]'
                    : 'stroke-transparent group-hover/muscle:stroke-muted-foreground group-focus-visible/muscle:stroke-ring',
                )}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * The body map (GYM-016): the built-in muscle groups, front and back, each
 * coloured with its readiness on the continuous scale under the figure's own
 * light and shade. A muscle is a button: choosing it opens its readiness.
 * Groups of my own aren't on it.
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
      {VIEWS.map((view) => (
        <figure key={view} className="flex flex-col items-center gap-1">
          <div className="w-full max-w-[160px] sm:max-w-[190px]">
            <Figure view={view} readiness={readiness} selected={selected} onSelect={onSelect} />
          </div>
          <figcaption className="text-xs font-semibold text-muted-foreground">
            {view === 'front' ? 'Front' : 'Back'}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
