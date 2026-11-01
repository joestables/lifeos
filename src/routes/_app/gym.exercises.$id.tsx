import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { WeightIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, PageHeader, TypeScope } from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ExerciseDialog } from '@/app/exercise-dialog'
import { ExerciseBadges, ExerciseMenu } from '@/app/exercise-library'
import { useProgressionPeriod } from '@/app/gym-library'
import { stalledExercises } from '@/app/progression'
import { ExerciseProgress, PeriodToggle } from '@/app/progression-parts'
import { queue, useGym } from '@/data'

/**
 * An Exercise on its own page, on a phone (GYM-003 4): its progression
 * (GYM-014), with Edit and Archive in its "…".
 */
export const Route = createFileRoute('/_app/gym/exercises/$id')({
  component: ExercisePage,
})

function ExercisePage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const gym = useGym(queue)
  const [editing, setEditing] = useState(false)
  const { period, change } = useProgressionPeriod()
  const [now] = useState(() => Date.now())
  const stalled = useMemo(() => stalledExercises(gym), [gym])
  const exercise = gym.exercises.find((x) => x.item.id === id)
  const back = () =>
    void navigate({ to: '/gym', search: { tab: 'progression', view: 'exercises' } })
  return (
    <TypeScope colour="coral">
      <PageHeader
        back={{ label: 'Progression', onClick: back }}
        title={exercise?.item.title ?? ''}
        trailing={
          exercise && (
            <ExerciseMenu exercise={exercise} onEdit={() => setEditing(true)} onArchived={back} />
          )
        }
      />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-12 sm:px-9">
        {!exercise && !gym.isLoading && (
          <EmptyState icon={WeightIcon} title="This exercise can't be found" />
        )}
        {exercise && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {stalled.has(exercise.item.id) && <Badge variant="warning">Stalled</Badge>}
              <ExerciseBadges exercise={exercise} />
            </div>
            <div className="self-start">
              <PeriodToggle value={period} onChange={change} />
            </div>
            {exercise.notes && (
              <Card>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {exercise.notes}
                </p>
              </Card>
            )}
            <ExerciseProgress gym={gym} exercise={exercise} period={period} now={now} />
          </>
        )}
      </div>
      {editing && exercise && (
        <ExerciseDialog gym={gym} exercise={exercise} onClose={() => setEditing(false)} />
      )}
    </TypeScope>
  )
}
