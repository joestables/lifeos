import { useNavigate } from '@tanstack/react-router'
import { TrophyIcon } from 'lucide-react'
import { useState } from 'react'
import {
  ChartKey,
  LinePill,
  PanelHeading,
  PanelRow,
  PrBadge,
  ProgressChart,
  StatTile,
  type ChartLine,
  type LineDash,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
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
import { currentText } from '@/lib/gym'
import { currentStrength, formatKg, MAX_LINES, toggleLine } from '@lifeos/fitness'
import {
  exerciseProgression,
  muscleProgression,
  periodOf,
  PERIODS,
  type Period,
} from './progression'

const DASHES: LineDash[] = ['solid', 'dash', 'dot']
const TREND: Record<string, string> = { rising: 'Rising', flat: 'Flat', falling: 'Falling' }
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
 * An Exercise's progression (GYM-014): its Strength chart over the period
 * with its primary group's stimulus sets under it, its figures, and the
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
  const rir = gym.settings.preferredRir
  const currentAt = currentStrength({ weightGrams: exercise.weightGrams, reps: exercise.reps }, rir)
  const open = (id: string) => void navigate({ to: '/gym/workouts/$id', params: { id } })
  const any = p.best.some((v) => v !== null)
  const last = p.lastTen[0]
  const lines: ChartLine[] = [
    {
      id: 'best',
      label: 'Best set',
      tone: 'coral',
      dash: 'solid',
      values: p.best,
      ...(p.prWeek !== undefined && { mark: p.prWeek }),
    },
    { id: 'current', label: 'Current', tone: 'grey', dash: 'dash', values: p.current },
  ]
  return (
    <>
      <Card className="gap-4">
        <PanelHeading title="Strength">
          <span className="text-sm text-muted-foreground">{periodOf(period).name}</span>
        </PanelHeading>
        {any ? (
          <>
            <ProgressChart
              weeks={p.weeks}
              lines={lines}
              bars={p.bars}
              target={p.target}
              barsLabel={`${p.muscle ?? 'No muscle'} · stimulus sets a week`}
            />
            <ChartKey
              items={[
                { label: 'Best set', tone: 'coral', dash: 'solid' },
                { label: 'Current', tone: 'grey', dash: 'dash' },
              ]}
            />
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No sets in this period</p>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Current"
          value={currentText(exercise.weightGrams, exercise.reps)}
          sub={currentAt === null ? undefined : `Strength ${currentAt.toFixed(1)} at ${rir} RIR`}
        />
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
              ? `${exercise.pr.set.rir} RIR · ${exercise.pr.strength.toFixed(1)} · ${shortDate(new Date(exercise.pr.at))}`
              : undefined
          }
          onClick={exercise.pr ? () => open(exercise.pr!.set.workoutId) : undefined}
        />
        <StatTile
          label={periodOf(period).name}
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

/**
 * Progression → Muscles (GYM-015 1): every group by category with its
 * average frequency and, where any, its stalled exercises.
 */
export function MusclesList({
  gym,
  frequency,
  stalled,
  selected,
  onOpen,
}: {
  gym: GymData
  frequency: ReadonlyMap<string, number>
  stalled: ReadonlySet<string>
  selected?: string
  onOpen: (muscleId: string) => void
}) {
  const stalledOf = (muscleId: string) =>
    gym.exercises.filter((x) => !x.archived && x.primary?.id === muscleId && stalled.has(x.item.id))
      .length
  return (
    <Card className="gap-1">
      {CATEGORIES.map((c, i) => {
        const muscles = gym.muscles.filter((m) => m.category === c.key)
        if (!muscles.length) return null
        return (
          <section key={c.key} aria-label={c.label} className="flex flex-col">
            <span className={`pb-1 text-xs font-semibold text-muted-foreground ${i ? 'pt-3' : ''}`}>
              {c.label}
            </span>
            {muscles.map((m) => {
              const n = stalledOf(m.id)
              return (
                <PanelRow
                  key={m.id}
                  selected={selected === m.id}
                  title={m.name}
                  meta={[`×${(frequency.get(m.id) ?? 0).toFixed(1)} a week`]}
                  trailing={n ? <Badge variant="warning">{n} stalled</Badge> : undefined}
                  onOpen={() => onOpen(m.id)}
                />
              )
            })}
          </section>
        )
      })}
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
        values: l.values,
      },
    ]
  })
  const pills = (title: string, kind: typeof primary, tone: 'coral' | 'grey') => {
    const count = kind.filter((l) => on.includes(l.exerciseId)).length
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {title} · {count} of {MAX_LINES} shown
        </span>
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
  const any = shown.some((l) => l.values.some((v) => v !== null))
  return (
    <>
      <Card className="gap-5">
        {heading && (
          <PanelHeading title={muscle.name}>
            <span className="text-sm text-muted-foreground">
              Change in strength · {periodOf(period).name.toLowerCase()}
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
                weeks={p.weeks}
                unit=" %"
                lines={shown}
                bars={p.bars}
                target={p.target}
                barsLabel={`${muscle.name} · stimulus sets a week`}
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
