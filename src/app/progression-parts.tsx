import { useNavigate } from '@tanstack/react-router'
import { BicepsFlexedIcon, SlidersHorizontalIcon, TrophyIcon } from 'lucide-react'
import { useState } from 'react'
import {
  FilterPanel,
  LinePill,
  PanelHeading,
  PanelRow,
  PrBadge,
  ProgressChart,
  SortMenu,
  StatTile,
  TypeTile,
  type ChartLine,
  type FilterGroup,
  type LineDash,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CATEGORIES, type ExerciseView, type GymData } from '@/data'
import { shortDate } from '@/lib/dates'
import {
  currentText,
  MUSCLE_LIST_SORTS,
  muscleListRows,
  since,
  type MuscleListSort,
} from '@/lib/gym'
import type { SortDirection } from '@/lib/sort'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMuscleListFilter } from './gym-library'
import { SearchField } from './search-field'
import { formatKg, MAX_LINES, toggleLine } from '@lifeos/fitness'
import { exerciseProgression, muscleProgression, PERIODS, type Period } from './progression'

const DASHES: LineDash[] = ['solid', 'dash', 'dot']
const TREND: Record<string, string> = { rising: 'Rising', flat: 'Flat', falling: 'Falling' }
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)} %`

/** The period, 1 M, 3 M or 1 Y (gym.md, Progression). */
export function PeriodToggle({
  value,
  onChange,
}: {
  value: Period
  onChange: (p: Period) => void
}) {
  return (
    <ToggleGroup
      value={[value]}
      aria-label="Period"
      onValueChange={(v: string[]) => v[0] && onChange(v[0] as Period)}
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem key={p.value} value={p.value} aria-label={p.name}>
          {p.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * An Exercise's progression (GYM-014): its best set's weight in each workout
 * over the period (or since it was first done), its reps over each point,
 * with its primary group's stimulus sets under it; its figures, and the
 * best set of each of its last ten workouts.
 */
export function ExerciseProgress({
  gym,
  exercise,
  period,
  now,
}: {
  gym: GymData
  exercise: ExerciseView
  period: Period
  now: number
}) {
  const navigate = useNavigate()
  const p = exerciseProgression(gym, exercise.item.id, period, now)
  const open = (id: string) => void navigate({ to: '/gym/workouts/$id', params: { id } })
  const any = p.points.length > 0
  const last = p.lastTen[0]
  const lines: ChartLine[] = [
    {
      id: 'best',
      label: 'Best set',
      tone: 'coral',
      dash: 'solid',
      points: p.points.map((pt) => ({
        at: pt.at,
        value: pt.weightGrams / 1000,
        above: `×${pt.reps}`,
        mark: pt.pr,
        title: `${shortDate(new Date(pt.at))} · ${pt.title}`,
        text: `${formatKg(pt.weightGrams)} kg × ${pt.reps} · ${pt.rir} RIR`,
      })),
    },
  ]
  return (
    <>
      <Card className="gap-4">
        <PanelHeading title="Best set">
          <span className="text-sm text-muted-foreground">kg · {p.span.name}</span>
        </PanelHeading>
        {any ? (
          <ProgressChart
            from={p.span.from}
            to={p.span.to}
            lines={lines}
            bars={p.bars}
            target={p.target}
            barsLabel={`${p.muscle ?? 'No muscle'} stimulus`}
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No sets in this period</p>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current" value={currentText(exercise.weightGrams, exercise.reps)} />
        <StatTile
          icon={<TrophyIcon />}
          label="PR"
          value={
            exercise.pr
              ? currentText(exercise.pr.set.weightGrams ?? 0, exercise.pr.set.reps ?? 0)
              : 'None yet'
          }
          sub={
            exercise.pr
              ? `${exercise.pr.set.rir} RIR · ${shortDate(new Date(exercise.pr.at))}`
              : undefined
          }
          onClick={exercise.pr ? () => open(exercise.pr!.set.workoutId) : undefined}
        />
        <StatTile
          label={capital(p.span.name)}
          value={p.change ? signed(p.change.percent) : '–'}
          sub={p.change ? TREND[p.change.trend] : 'Too few workouts'}
        />
        <StatTile
          label="Last done"
          value={last ? shortDate(new Date(last.endedAt)) : 'Never'}
          sub={last?.set.workout.item.title}
        />
      </div>
      <Card className="gap-2">
        <PanelHeading title="Best sets" />
        {p.lastTen.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sets yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workout</TableHead>
                <TableHead className="text-right">kg</TableHead>
                <TableHead className="text-right">Reps</TableHead>
                <TableHead className="text-right">RIR</TableHead>
                <TableHead className="text-right">Strength</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.lastTen.map((b) => (
                <TableRow
                  key={b.workoutId}
                  className="cursor-pointer"
                  onClick={() => open(b.workoutId)}
                >
                  <TableCell>
                    <span className="font-semibold">{shortDate(new Date(b.endedAt))}</span>
                    <span className="text-muted-foreground"> · {b.set.workout.item.title}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKg(b.set.weightGrams ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{b.set.reps}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.set.rir}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      {b.set.pr && <PrBadge />}
                      {b.strength.toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}

const MUSCLE_GROUP = { categories: 'Category', muscles: 'Muscle group' } as const

/**
 * Progression → Muscles (GYM-015 1), like the exercise library (Joe, 3
 * November): a search, filters (in a Sheet) and a sort, then each muscle
 * group with its category, when it was last trained and, where any, its
 * stalled exercises.
 */
export function MusclesList({
  gym,
  lastTrained,
  stalled,
  selected,
  onOpen,
}: {
  gym: GymData
  lastTrained: ReadonlyMap<string, number | null>
  stalled: ReadonlySet<string>
  selected?: string
  onOpen: (muscleId: string) => void
}) {
  const { filter, change, setSearch } = useMuscleListFilter()
  const [sheet, setSheet] = useState(false)
  const rows = gym.muscles.map((m, order) => ({
    muscle: m,
    name: m.name,
    category: m.category,
    order,
    lastTrained: lastTrained.get(m.id) ?? null,
  }))
  const shown = muscleListRows(rows, filter)
  const chosen = filter.categories.length + filter.muscles.length
  const groups: FilterGroup[] = [
    {
      name: MUSCLE_GROUP.categories,
      values: CATEGORIES.map((c) => c.label),
      chosen: CATEGORIES.filter((c) => filter.categories.includes(c.key)).map((c) => c.label),
      open: true,
    },
    {
      name: MUSCLE_GROUP.muscles,
      values: gym.muscles.map((m) => m.name),
      chosen: [...filter.muscles],
    },
  ]
  const onChange = (group: string, values: string[]) =>
    group === MUSCLE_GROUP.categories
      ? change({ categories: CATEGORIES.filter((c) => values.includes(c.label)).map((c) => c.key) })
      : change({ muscles: values })
  const reset = () => change({ categories: [], muscles: [] })
  const stalledOf = (muscleId: string) =>
    gym.exercises.filter((x) => !x.archived && x.primary?.id === muscleId && stalled.has(x.item.id))
      .length
  return (
    <Card className="gap-3">
      <div className="flex items-center gap-2">
        <SearchField label="Search muscles" value={filter.search} onChange={setSearch} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Filters"
          className="relative"
          onClick={() => setSheet(true)}
        >
          <SlidersHorizontalIcon />
          {chosen > 0 && <Badge className="absolute -top-2 -right-2">{chosen}</Badge>}
        </Button>
        <SortMenu<MuscleListSort>
          options={MUSCLE_LIST_SORTS}
          value={filter.sort}
          direction={filter.direction}
          onChange={(sort, direction: SortDirection) => change({ sort, direction })}
        />
      </div>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No muscle groups match</p>
      ) : (
        <div className="flex flex-col">
          {shown.map(({ muscle: m, lastTrained: at }) => {
            const n = stalledOf(m.id)
            return (
              <PanelRow
                key={m.id}
                selected={selected === m.id}
                leading={<TypeTile colour="coral" icon={BicepsFlexedIcon} />}
                title={m.name}
                meta={[
                  CATEGORIES.find((c) => c.key === m.category)?.label ?? m.category,
                  at === null ? 'Never trained' : since('Trained', at),
                ]}
                trailing={n ? <Badge variant="warning">{n} stalled</Badge> : undefined}
                onOpen={() => onOpen(m.id)}
              />
            )
          })}
        </div>
      )}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="right" initialFocus={false} data-colour="coral">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div>
            <FilterPanel bare groups={groups} onChange={onChange} onReset={reset} />
          </div>
          <SheetFooter className="grid grid-cols-2">
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button onClick={() => setSheet(false)}>
              {shown.length === 1 ? 'Show 1 muscle group' : `Show ${shown.length} muscle groups`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

/**
 * A muscle group's progression (GYM-015 2–5): a pill for each exercise it is
 * primary for, then secondary, each showing or hiding its line — three of a
 * kind at most, coral or grey, solid, dashed and dotted in the order turned
 * on — over its stimulus sets a week and its target.
 */
export function MuscleProgress({
  gym,
  muscleId,
  period,
  now,
  heading = true,
}: {
  gym: GymData
  muscleId: string
  period: Period
  now: number
  heading?: boolean
}) {
  const muscle = gym.muscles.find((m) => m.id === muscleId)
  const p = muscleProgression(gym, muscleId, period, now)
  // The starting lines until one is turned on or off, so they follow the workouts as they load.
  const [chosen, setChosen] = useState<string[] | null>(null)
  const on = chosen ?? p.start
  if (!muscle) return null
  const primary = p.lines.filter((l) => l.primary)
  const secondary = p.lines.filter((l) => !l.primary)
  const dashOf = (id: string, kind: readonly { exerciseId: string }[]) => {
    const ids = new Set(kind.map((k) => k.exerciseId))
    return DASHES[on.filter((x) => ids.has(x)).indexOf(id)] ?? 'solid'
  }
  const shown: ChartLine[] = on.flatMap((id) => {
    const l = p.lines.find((x) => x.exerciseId === id)
    if (!l) return []
    return [
      {
        id,
        label: l.name,
        tone: l.primary ? 'coral' : 'grey',
        dash: dashOf(id, l.primary ? primary : secondary),
        points: l.points.map((pt) => ({
          at: pt.at,
          value: pt.value,
          title: `${shortDate(new Date(pt.at))} · ${pt.title}`,
          text: signed(pt.value),
        })),
      },
    ]
  })
  const pills = (title: string, kind: typeof primary, tone: 'coral' | 'grey') => {
    const count = kind.filter((l) => on.includes(l.exerciseId)).length
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <div className="flex flex-wrap gap-1.5">
          {kind.map((l) => {
            const isOn = on.includes(l.exerciseId)
            return (
              <LinePill
                key={l.exerciseId}
                label={l.name}
                sub={l.primary ? undefined : `(${l.contribution})`}
                on={isOn}
                tone={tone}
                dash={isOn ? dashOf(l.exerciseId, kind) : undefined}
                disabled={!isOn && count >= MAX_LINES}
                onClick={() =>
                  setChosen(
                    toggleLine(
                      on,
                      l.exerciseId,
                      kind.map((k) => k.exerciseId),
                    ),
                  )
                }
              />
            )
          })}
        </div>
      </div>
    )
  }
  const any = shown.some((l) => l.points.length > 0)
  return (
    <>
      <Card className="gap-5">
        {heading && (
          <PanelHeading title={muscle.name}>
            <span className="text-sm text-muted-foreground">
              Change in strength · {p.span.name.toLowerCase()}
            </span>
          </PanelHeading>
        )}
        {p.lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No exercises train it</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {primary.length > 0 && pills('Primary', primary, 'coral')}
              {secondary.length > 0 && pills('Secondary', secondary, 'grey')}
            </div>
            {any ? (
              <ProgressChart
                from={p.span.from}
                to={p.span.to}
                unit=" %"
                lines={shown}
                bars={p.bars}
                target={p.target}
                barsLabel={`${muscle.name} stimulus`}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sets in this period
              </p>
            )}
          </>
        )}
      </Card>
      {/* Stacked on a phone, so each says its target in full. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Stimulus sets"
          value={p.stimulusAWeek.toFixed(1)}
          sub={`a week, target ${muscle.stimulusTarget}`}
        />
        <StatTile
          label="Workouts"
          value={p.workoutsAWeek.toFixed(1)}
          sub={`a week, target ${muscle.frequencyTarget}`}
        />
        <StatTile
          label="Rising"
          value={`${p.rising.count} of ${p.rising.of}`}
          sub="primary exercises"
        />
      </div>
    </>
  )
}
