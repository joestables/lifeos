import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ListDetail, PageAction, PageHeader, TabsRow, TypeScope } from '@/components/lifeos'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ExerciseDialog } from '@/app/exercise-dialog'
import { NewWorkoutDialog } from '@/app/new-workout'
import { TemplatesCard } from '@/app/template-parts'
import { RecentCard, TodayCard } from '@/app/workout-cards'
import { RecoveryTab } from '@/app/recovery-tab'
import { useRecovery } from '@/app/recovery'
import { ExerciseDetail, ExerciseList } from '@/app/exercise-library'
import { useLibrary, useLibraryFilter, useProgressionPeriod } from '@/app/gym-library'
import { stalledExercises } from '@/app/progression'
import { MuscleProgress, MusclesList, PeriodToggle } from '@/app/progression-parts'
import { todayIn } from '@lifeos/recurrence'
import { queue, useGym, useSettings, type ExerciseView } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useIsWide } from '@/hooks/use-wide'
import { lastUsedText } from '@/lib/gym'
import { useNow } from '@/hooks/use-now'

type Tab = 'workouts' | 'recovery' | 'progression'
type View = 'muscles' | 'exercises'

interface GymSearch {
  tab?: Tab
  view?: View
  exercise?: string
  muscle?: string
}

/**
 * The Gym (gym.md, What the page shows): Workouts, Recovery and Progression.
 * Workouts shows today, my recent workouts and my templates (GYM-013,
 * GYM-006 6), with what to do next (GYM-018); Recovery my readiness
 * (GYM-016); Progression → Exercises is the exercise library (GYM-003);
 * progression's charts come with plan step 10.
 */
export const Route = createFileRoute('/_app/gym/')({
  validateSearch: (s: Record<string, unknown>): GymSearch => ({
    ...(s.tab === 'workouts' || s.tab === 'recovery' || s.tab === 'progression'
      ? { tab: s.tab }
      : {}),
    ...(s.view === 'muscles' || s.view === 'exercises' ? { view: s.view } : {}),
    ...(typeof s.exercise === 'string' ? { exercise: s.exercise } : {}),
    ...(typeof s.muscle === 'string' ? { muscle: s.muscle } : {}),
  }),
  component: Gym,
})

function Gym() {
  const navigate = useNavigate({ from: '/gym/' })
  const search = Route.useSearch()
  const tab = search.tab ?? 'workouts'
  const view = search.view ?? 'exercises'
  const gym = useGym(queue)
  const library = useLibraryFilter()
  const shown = useLibrary(gym, library.filter)
  const [editing, setEditing] = useState<ExerciseView | 'new' | null>(null)
  // On a computer the chosen Exercise shows beside the list; on a phone it opens its own page.
  const wide = useIsWide()
  const phone = useIsMobile()
  const selected = wide ? (shown.find((x) => x.item.id === search.exercise) ?? shown[0]) : undefined
  const set = (next: GymSearch) =>
    void navigate({ search: (s) => ({ ...s, ...next }), replace: true })
  const open = (x: ExerciseView) =>
    wide
      ? set({ exercise: x.item.id })
      : void navigate({ to: '/gym/exercises/$id', params: { id: x.item.id } })
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const [planning, setPlanning] = useState<{ template?: string } | null>(null)
  // Kept current, so readiness and progression move on while the page is open.
  const now = useNow()
  const recovery = useRecovery(gym, now)
  const suggestion = recovery.suggestion && {
    template: recovery.suggestion.template,
    readiness: recovery.suggestion.readiness,
    lastUsed: lastUsedText(recovery.suggestion.template.lastUsed, now),
  }
  const { period, change: changePeriod } = useProgressionPeriod()
  const stalled = useMemo(() => stalledExercises(gym), [gym])
  const muscleId = wide ? (search.muscle ?? gym.muscles[0]?.id) : undefined
  const openMuscle = (id: string) =>
    wide ? set({ muscle: id }) : void navigate({ to: '/gym/muscles/$id', params: { id } })
  const newExercise =
    tab === 'progression' && view === 'exercises'
      ? { label: 'New exercise', onClick: () => setEditing('new') }
      : tab === 'workouts'
        ? { label: 'New workout', onClick: () => setPlanning({}) }
        : undefined

  return (
    <TypeScope colour="coral">
      <PageHeader title="Gym" action={newExercise} />
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 md:pb-12">
        <TabsRow>
          <Tabs value={tab} onValueChange={(t) => set({ tab: t as Tab })}>
            <TabsList>
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
              <TabsTrigger value="recovery">Recovery</TabsTrigger>
              <TabsTrigger value="progression">Progression</TabsTrigger>
            </TabsList>
          </Tabs>
          {newExercise && <PageAction label={newExercise.label} onClick={newExercise.onClick} />}
        </TabsRow>
        {tab === 'workouts' && (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <TodayCard
                gym={gym}
                today={today}
                phone={phone}
                suggestion={suggestion}
                onSuggestion={(template) => setPlanning({ template })}
              />
              <RecentCard gym={gym} today={today} phone={phone} />
            </div>
            <TemplatesCard gym={gym} count={phone ? 3 : 6} />
          </div>
        )}
        {tab === 'recovery' && <RecoveryTab recovery={recovery} />}
        {tab === 'progression' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ToggleGroup
                value={[view]}
                aria-label="Show"
                onValueChange={(v: string[]) => v[0] && set({ view: v[0] as View })}
              >
                <ToggleGroupItem value="muscles">Muscles</ToggleGroupItem>
                <ToggleGroupItem value="exercises">Exercises</ToggleGroupItem>
              </ToggleGroup>
              {wide && <PeriodToggle value={period} onChange={changePeriod} />}
            </div>
            {view === 'muscles' ? (
              <ListDetail
                list={
                  <MusclesList
                    gym={gym}
                    lastTrained={new Map(recovery.muscles.map((m) => [m.muscle.id, m.lastTrained]))}
                    stalled={stalled}
                    selected={muscleId}
                    onOpen={openMuscle}
                  />
                }
                detail={
                  muscleId && (
                    <MuscleProgress
                      key={`${muscleId}-${period}`}
                      gym={gym}
                      muscleId={muscleId}
                      period={period}
                      now={now}
                    />
                  )
                }
              />
            ) : (
              <ListDetail
                list={
                  <ExerciseList
                    gym={gym}
                    {...library}
                    shown={shown}
                    selected={selected?.item.id}
                    stalled={stalled}
                    onOpen={open}
                  />
                }
                detail={
                  selected && (
                    <ExerciseDetail
                      exercise={selected}
                      gym={gym}
                      period={period}
                      now={now}
                      stalled={stalled.has(selected.item.id)}
                      onEdit={() => setEditing(selected)}
                    />
                  )
                }
              />
            )}
          </>
        )}
      </div>
      {planning && (
        <NewWorkoutDialog
          gym={gym}
          today={today}
          template={planning.template}
          onClose={() => setPlanning(null)}
          onMade={(id) => void navigate({ to: '/gym/workouts/$id', params: { id } })}
        />
      )}
      {editing && (
        <ExerciseDialog
          gym={gym}
          exercise={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onMade={(id) => wide && set({ exercise: id })}
        />
      )}
    </TypeScope>
  )
}
