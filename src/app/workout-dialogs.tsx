import { formatKg, motivationOf, stepWeight, type Motivation } from '@lifeos/fitness'
import { Trash2Icon } from 'lucide-react'
import { useId, useState } from 'react'
import { MotivationChoice, SetLine, StarRating, StatTile, ValueStepper } from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  endWorkout,
  logSet,
  positionBetween,
  removeSet,
  updateExercise,
  updateSet,
  updateWorkout,
  type EntryView,
  type ExerciseView,
  type GymData,
  type SetView,
  type WorkoutView,
} from '@/data'
import { shortDate } from '@/lib/dates'
import { currentText, MAX_WEIGHT_GRAMS, nextSet, parseWeight, shownSet } from '@/lib/gym'
import { Field } from './task-details'

const RIRS = [0, 1, 2, 3, 4, 5] as const
const REPS = [1, 100] as const

/** Weight and reps side by side, each headed, stepped or typed (GYM-010 1, 2). */
function WeightReps({
  weight,
  reps,
  increment,
  onWeight,
  onReps,
  unit = false,
}: {
  weight: number
  reps: number
  increment: number
  onWeight: (grams: number) => void
  onReps: (reps: number) => void
  /** "kg" after the weight, when the heading doesn't say it. */
  unit?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={unit ? 'Weight' : 'Weight (kg)'}>
        <ValueStepper
          size="lg"
          label="Weight"
          value={formatKg(weight)}
          unit={unit ? 'kg' : undefined}
          canDown={weight > 0}
          canUp={weight + increment <= MAX_WEIGHT_GRAMS}
          onStep={(d) => onWeight(stepWeight(weight, increment, d))}
          onType={(t) => {
            const g = parseWeight(t)
            if (g !== null) onWeight(g)
          }}
        />
      </Field>
      <Field label="Reps">
        <ValueStepper
          size="lg"
          label="Reps"
          value={String(reps)}
          canDown={reps > REPS[0]}
          canUp={reps < REPS[1]}
          onStep={(d) => onReps(reps + d)}
          onType={(t) => {
            const n = Number(t)
            if (Number.isInteger(n) && n >= REPS[0] && n <= REPS[1]) onReps(n)
          }}
        />
      </Field>
    </div>
  )
}

/**
 * Logging a set, or changing one (GYM-010): Tracked or Quick at its top;
 * Tracked, weight and reps from the last set logged on it this workout (or
 * its Current set) and RIR as buttons from my preferred RIR; Quick, nothing
 * more. A set opened to change can be deleted, with Undo.
 */
export function LogSetDialog({
  entry,
  set,
  preferredRir,
  onClose,
}: {
  entry: EntryView
  /** The set changed; none for a new one. */
  set?: SetView
  preferredRir: number
  onClose: () => void
}) {
  const start =
    set && set.weightGrams !== null && set.reps !== null
      ? { weightGrams: set.weightGrams, reps: set.reps, rir: set.rir ?? preferredRir }
      : nextSet(entry.sets, entry.current, preferredRir)
  const [quick, setQuick] = useState(Boolean(set) && set?.weightGrams === null)
  const [weight, setWeight] = useState(start.weightGrams)
  const [reps, setReps] = useState(start.reps)
  const [rir, setRir] = useState(start.rir)
  const n = set ? entry.sets.findIndex((s) => s.id === set.id) + 1 : entry.sets.length + 1
  const fields = quick
    ? { weightGrams: null, reps: null, rir: null }
    : { weightGrams: weight, reps, rir }
  const save = () => {
    if (set) updateSet(entry.workoutId, set.id, fields)
    else
      logSet(entry.workoutId, entry.id, positionBetween(entry.sets.at(-1)?.position, null), fields)
    onClose()
  }
  const remove = () => {
    if (!set) return
    removeSet(entry.workoutId, set.id)
    toast(`Deleted set ${n}`, {
      action: {
        label: 'Undo',
        onClick: () =>
          logSet(
            entry.workoutId,
            entry.id,
            set.position,
            { weightGrams: set.weightGrams, reps: set.reps, rir: set.rir },
            set.loggedAt,
          ),
      },
    })
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{set ? `Set ${n}` : entry.name}</DialogTitle>
          <span className="text-sm text-muted-foreground tabular-nums">
            {set
              ? entry.name
              : `Set ${n} · Current ${currentText(entry.current.weightGrams, entry.current.reps)}`}
          </span>
        </DialogHeader>
        <ToggleGroup
          value={[quick ? 'quick' : 'tracked']}
          onValueChange={(v: string[]) => v[0] && setQuick(v[0] === 'quick')}
          aria-label="How to log it"
          className="self-start"
        >
          <ToggleGroupItem value="tracked">Tracked</ToggleGroupItem>
          <ToggleGroupItem value="quick">Quick</ToggleGroupItem>
        </ToggleGroup>
        {quick ? (
          <span className="text-sm text-muted-foreground">No weight, reps or RIR</span>
        ) : (
          <div className="flex flex-col gap-4">
            <WeightReps
              weight={weight}
              reps={reps}
              increment={entry.exercise?.equipment?.incrementGrams ?? 2500}
              onWeight={setWeight}
              onReps={setReps}
            />
            <Field label="RIR">
              <ToggleGroup
                value={[String(rir)]}
                onValueChange={(v: string[]) => v[0] !== undefined && setRir(Number(v[0]))}
                aria-label="RIR"
                className="grid w-full grid-cols-6 self-stretch"
              >
                {RIRS.map((r) => (
                  <ToggleGroupItem
                    key={r}
                    value={String(r)}
                    className="h-10 justify-center text-base tabular-nums"
                  >
                    {r}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </div>
        )}
        <DialogFooter>
          {set && (
            <Button variant="ghost-destructive" className="sm:mr-auto" onClick={remove}>
              <Trash2Icon /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{set ? 'Save' : 'Log set'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MOTIVATIONS: Motivation[] = ['low', 'okay', 'high']

/**
 * End workout (GYM-012 1, 2): how it went as stars, motivation beforehand,
 * notes, all optional; what is left in the backlog is said, and left out.
 * A finished workout's ratings and notes are corrected in it too (GYM-012 6).
 */
export function EndWorkoutDialog({
  workout,
  onClose,
}: {
  workout: WorkoutView
  onClose: () => void
}) {
  const ids = useId()
  const finished = workout.stage === 'complete'
  const [stars, setStars] = useState(workout.howItWent ?? 0)
  const [motivation, setMotivation] = useState<Motivation | null>(motivationOf(workout.motivation))
  const [notes, setNotes] = useState(workout.notes ?? '')
  const left = finished ? 0 : workout.backlog.length
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{finished ? 'How it went' : 'End workout'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <Field label="How it went">
            <div className="-ml-1.5">
              <StarRating value={stars} onChange={setStars} />
            </div>
          </Field>
          <Field label="Motivation beforehand">
            <MotivationChoice value={motivation} onChange={setMotivation} />
          </Field>
          <Field label="Notes" htmlFor={`${ids}-notes`}>
            <Textarea
              id={`${ids}-notes`}
              placeholder="Notes"
              value={notes}
              maxLength={5000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          {left > 0 && (
            <Badge variant="outline" className="self-start">
              {left} in the backlog {left === 1 ? 'is' : 'are'} left out
            </Badge>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const fields = {
                howItWent: stars || null,
                motivation: motivation ? MOTIVATIONS.indexOf(motivation) + 1 : null,
                notes,
              }
              if (finished) updateWorkout(workout.item.id, fields)
              else endWorkout(workout.item.id, fields)
              onClose()
            }}
          >
            {finished ? 'Save' : 'End workout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Update current (GYM-012 4): the workout's best set by strength offered as
 * the new Current set, weight and reps to change before saving; nothing
 * changes unless I save.
 */
export function UpdateCurrentDialog({
  exercise,
  best,
  onClose,
}: {
  exercise: ExerciseView
  best: SetView
  onClose: () => void
}) {
  const [weight, setWeight] = useState(best.weightGrams ?? exercise.weightGrams)
  const [reps, setReps] = useState(best.reps ?? exercise.reps)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update current</DialogTitle>
          <span className="text-sm text-muted-foreground">{exercise.item.title}</span>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            inset
            label="Current"
            value={currentText(exercise.weightGrams, exercise.reps)}
          />
          <StatTile
            inset
            label="Best set"
            value={currentText(best.weightGrams ?? 0, best.reps ?? 0)}
            sub={`${best.rir} RIR · Strength ${best.strength?.toFixed(1)}`}
          />
        </div>
        <WeightReps
          unit
          weight={weight}
          reps={reps}
          increment={exercise.equipment?.incrementGrams ?? 2500}
          onWeight={setWeight}
          onReps={setReps}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              updateExercise(exercise.item.id, { weightGrams: weight, reps })
              toast(`${exercise.item.title}: Current ${currentText(weight, reps)}`)
              onClose()
            }}
          >
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Strength history (GYM-010 5): an exercise's ten most recent sets, under
 * their workouts, newest first, RIR in brackets, the PR marked.
 */
export function StrengthHistoryDialog({
  gym,
  exercise,
  onClose,
}: {
  gym: GymData
  exercise: ExerciseView
  onClose: () => void
}) {
  const groups: { workout: WorkoutView; sets: SetView[] }[] = []
  let count = 0
  for (const w of gym.workouts) {
    if (count >= 10) break
    if (w.stage === 'planned') continue
    const sets = w.session
      .filter((e) => e.exercise?.item.id === exercise.item.id)
      .flatMap((e) => e.sets)
      // A quick set is nowhere in the record (GYM-010 3).
      .filter((s) => s.weightGrams !== null)
      .reverse()
      .slice(0, 10 - count)
    if (!sets.length) continue
    count += sets.length
    groups.push({ workout: w, sets })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent list data-colour="coral" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exercise.item.title}</DialogTitle>
          <span className="text-sm text-muted-foreground">Strength history · last 10 sets</span>
        </DialogHeader>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sets yet</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(({ workout, sets }) => (
              <section key={workout.item.id} className="flex flex-col">
                <div className="flex items-center justify-between px-1 pb-1 text-xs font-semibold text-muted-foreground">
                  <span>
                    {workout.item.do_on ? shortDate(new Date(`${workout.item.do_on}T12:00`)) : ''} ·{' '}
                    {workout.item.title}
                  </span>
                  <span>Strength</span>
                </div>
                {sets.map((s, i) => (
                  <SetLine key={s.id} n={sets.length - i} set={shownSet(s)} />
                ))}
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
