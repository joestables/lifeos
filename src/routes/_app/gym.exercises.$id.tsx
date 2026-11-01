import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { WeightIcon } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, PageHeader, TypeScope } from '@/components/lifeos'
import { Card } from '@/components/ui/card'
import { ExerciseDialog } from '@/app/exercise-dialog'
import { ExerciseBadges, ExerciseFigures, ExerciseMenu } from '@/app/exercise-library'
import { queue, useGym } from '@/data'

/** An Exercise on its own page, on a phone (GYM-003 4): Edit and Archive in its "…". */
export const Route = createFileRoute('/_app/gym/exercises/$id')({
  component: ExercisePage,
})

function ExercisePage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const gym = useGym(queue)
  const [editing, setEditing] = useState(false)
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
            <ExerciseBadges exercise={exercise} />
            {exercise.notes && (
              <Card>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {exercise.notes}
                </p>
              </Card>
            )}
            <ExerciseFigures exercise={exercise} preferredRir={gym.settings.preferredRir} />
          </>
        )}
      </div>
      {editing && exercise && (
        <ExerciseDialog gym={gym} exercise={exercise} onClose={() => setEditing(false)} />
      )}
    </TypeScope>
  )
}
