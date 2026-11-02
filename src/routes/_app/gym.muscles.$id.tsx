import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ActivityIcon } from 'lucide-react'
import { EmptyState, PageHeader, TypeScope } from '@/components/lifeos'
import { useProgressionPeriod } from '@/app/gym-library'
import { MuscleProgress, PeriodToggle } from '@/app/progression-parts'
import { queue, useGym } from '@/data'
import { useNow } from '@/hooks/use-now'

/** A muscle group's progression on its own page, on a phone (GYM-015 2–5). */
export const Route = createFileRoute('/_app/gym/muscles/$id')({
  component: MusclePage,
})

function MusclePage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const gym = useGym(queue)
  const { period, change } = useProgressionPeriod()
  // Kept current, so readiness and progression move on while the page is open.
  const now = useNow()
  const muscle = gym.muscles.find((m) => m.id === id)
  const back = () => void navigate({ to: '/gym', search: { tab: 'progression', view: 'muscles' } })
  return (
    <TypeScope colour="coral">
      <PageHeader back={{ label: 'Progression', onClick: back }} title={muscle?.name ?? ''} />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-12 sm:px-9">
        {!muscle && !gym.isLoading && (
          <EmptyState icon={ActivityIcon} title="This muscle group can't be found" />
        )}
        {muscle && (
          <>
            <div className="self-start">
              <PeriodToggle value={period} onChange={change} />
            </div>
            <MuscleProgress
              key={period}
              gym={gym}
              muscleId={muscle.id}
              period={period}
              now={now}
              heading={false}
            />
          </>
        )}
      </div>
    </TypeScope>
  )
}
