import { DumbbellIcon } from 'lucide-react'
import { useState } from 'react'
import { BackLink, MuscleChoice, PickRow, TypeTile } from '@/components/lifeos'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CATEGORIES, type ExerciseView, type GymData, type MuscleView } from '@/data'
import { currentText, withShare } from '@/lib/gym'
import { SearchField } from './search-field'

const tile = <TypeTile size="sm" colour="coral" icon={DumbbellIcon} />

/** "Barbell · 60 kg × 8": its equipment and Current set. */
const meta = (x: ExerciseView) =>
  [x.equipment?.name, currentText(x.weightGrams, x.reps)].filter(Boolean).join(' · ')

function Section({
  title,
  exercises,
  meta: metaOf,
  onPick,
}: {
  title: string
  exercises: readonly ExerciseView[]
  meta: (x: ExerciseView) => string
  onPick: (x: ExerciseView) => void
}) {
  if (!exercises.length) return null
  return (
    <div className="flex flex-col">
      <span className="px-1.5 pb-1 text-xs font-semibold text-muted-foreground">{title}</span>
      {exercises.map((x) => (
        <PickRow
          key={x.item.id}
          leading={tile}
          title={x.item.title}
          meta={metaOf(x)}
          onClick={() => onPick(x)}
        />
      ))}
    </div>
  )
}

/**
 * Adding or swapping an exercise, by muscle group (GYM-009, GYM-006 1;
 * Joe, 31 October): every group first, by category, with how many exercises
 * work it, and a search; a group lists the exercises it is primary for, then
 * those it is secondary for, a secondary's contribution in brackets. Archived
 * Exercises are never offered (GYM-005).
 */
export function ExercisePicker({
  gym,
  title,
  subtitle,
  muscle: startMuscle,
  except = [],
  onPick,
  onClose,
}: {
  gym: GymData
  title: string
  /** Under the title ("Swap Bench press" names the muscle it works). */
  subtitle?: string
  /** A group to open at (a swap opens at the exercise's primary). */
  muscle?: string
  /** Exercises not to offer (the one being swapped). */
  except?: readonly string[]
  onPick: (exercise: ExerciseView) => void
  onClose: () => void
}) {
  const [muscleId, setMuscleId] = useState<string | undefined>(startMuscle)
  const [search, setSearch] = useState('')
  const live = gym.exercises.filter((x) => !x.archived && !except.includes(x.item.id))
  const muscle = muscleId ? gym.muscleById.get(muscleId) : undefined
  const pick = (x: ExerciseView) => {
    onPick(x)
    onClose()
  }
  const works = (m: MuscleView) =>
    live.filter((x) => x.primary?.id === m.id || x.secondaries.some((s) => s.muscle.id === m.id))
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const found = words.length
    ? live.filter((x) => words.every((w) => x.item.title.toLowerCase().includes(w)))
    : null

  let body
  if (found) {
    body = found.length ? (
      <Section title="Exercises" exercises={found} meta={meta} onPick={pick} />
    ) : (
      <p className="py-6 text-center text-sm text-muted-foreground">No exercises match</p>
    )
  } else if (muscle) {
    const share = (x: ExerciseView) =>
      x.secondaries.find((s) => s.muscle.id === muscle.id)?.contribution ?? 0
    const primary = live.filter((x) => x.primary?.id === muscle.id)
    const secondary = live
      .filter((x) => share(x) > 0)
      .sort((a, b) => share(b) - share(a) || a.item.title.localeCompare(b.item.title))
    body =
      primary.length || secondary.length ? (
        <div className="flex flex-col gap-3">
          <Section title="Primary" exercises={primary} meta={meta} onPick={pick} />
          <Section
            title="Secondary"
            exercises={secondary}
            meta={(x) =>
              [x.equipment?.name, withShare(muscle.name, share(x))].filter(Boolean).join(' · ')
            }
            onPick={pick}
          />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No exercises work {muscle.name}
        </p>
      )
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {CATEGORIES.map((c) => {
          const muscles = gym.muscles.filter((m) => m.category === c.key)
          if (!muscles.length) return null
          return (
            <section key={c.key} className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{c.label}</span>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {muscles.map((m) => (
                  <MuscleChoice
                    key={m.id}
                    name={m.name}
                    count={works(m).length}
                    onClick={() => setMuscleId(m.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent list data-colour="coral" className="sm:max-w-lg">
        <DialogHeader>
          {muscle && !found && (
            <BackLink
              label="All muscle groups"
              className="-mb-1 self-start"
              onClick={() => setMuscleId(undefined)}
            />
          )}
          <DialogTitle>{muscle && !found && !subtitle ? muscle.name : title}</DialogTitle>
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        </DialogHeader>
        <SearchField label="Find an exercise" value={search} onChange={setSearch} />
        {body}
      </DialogContent>
    </Dialog>
  )
}
