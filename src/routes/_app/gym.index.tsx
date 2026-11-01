import { averageFrequency } from '@lifeos/fitness'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ActivityIcon, DumbbellIcon } from 'lucide-react'
import { useState } from 'react'
import {
  EmptyState,
  ListDetail,
  PageAction,
  PageHeader,
  PanelRow,
  TabsRow,
  TypeScope,
} from '@/components/lifeos'
import { Card, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ExerciseDialog } from '@/app/exercise-dialog'
import { ExerciseDetail, ExerciseList } from '@/app/exercise-library'
import { useLibrary, useLibraryFilter } from '@/app/gym-library'
import { CATEGORIES, queue, useGym, type ExerciseView } from '@/data'
import { useIsWide } from '@/hooks/use-wide'

type Tab = 'workouts' | 'recovery' | 'progression'
type View = 'muscles' | 'exercises'

interface GymSearch {
  tab?: Tab
  view?: View
  exercise?: string
}

/**
 * The Gym (gym.md, What the page shows): Workouts, Recovery and Progression.
 * Progression → Exercises is the exercise library (GYM-003); workouts,
 * recovery and progression's charts come with plan steps 8–10.
 */
export const Route = createFileRoute('/_app/gym/')({
  validateSearch: (s: Record<string, unknown>): GymSearch => ({
    ...(s.tab === 'workouts' || s.tab === 'recovery' || s.tab === 'progression'
      ? { tab: s.tab }
      : {}),
    ...(s.view === 'muscles' || s.view === 'exercises' ? { view: s.view } : {}),
    ...(typeof s.exercise === 'string' ? { exercise: s.exercise } : {}),
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
  const selected = wide ? (shown.find((x) => x.item.id === search.exercise) ?? shown[0]) : undefined
  const set = (next: GymSearch) =>
    void navigate({ search: (s) => ({ ...s, ...next }), replace: true })
  const open = (x: ExerciseView) =>
    wide
      ? set({ exercise: x.item.id })
      : void navigate({ to: '/gym/exercises/$id', params: { id: x.item.id } })
  const newExercise =
    tab === 'progression' && view === 'exercises'
      ? { label: 'New exercise', onClick: () => setEditing('new') }
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
        {tab === 'workouts' && <EmptyState icon={DumbbellIcon} title="No workouts yet" />}
        {tab === 'recovery' && <EmptyState icon={ActivityIcon} title="Nothing trained yet" />}
        {tab === 'progression' && (
          <>
            <ToggleGroup
              value={[view]}
              aria-label="Show"
              className="self-start"
              onValueChange={(v: string[]) => v[0] && set({ view: v[0] as View })}
            >
              <ToggleGroupItem value="muscles">Muscles</ToggleGroupItem>
              <ToggleGroupItem value="exercises">Exercises</ToggleGroupItem>
            </ToggleGroup>
            {view === 'muscles' ? (
              <Muscles gym={gym} />
            ) : (
              <ListDetail
                list={
                  <ExerciseList
                    gym={gym}
                    {...library}
                    shown={shown}
                    selected={selected?.item.id}
                    onOpen={open}
                  />
                }
                detail={
                  selected && (
                    <ExerciseDetail
                      exercise={selected}
                      preferredRir={gym.settings.preferredRir}
                      onEdit={() => setEditing(selected)}
                    />
                  )
                }
              />
            )}
          </>
        )}
      </div>
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

/**
 * Progression → Muscles (GYM-015 1): every group by category with its
 * average frequency; its chart comes with plan step 10.
 */
function Muscles({ gym }: { gym: ReturnType<typeof useGym> }) {
  // The last 28 days to now, as the page opened.
  const [now] = useState(() => Date.now())
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {CATEGORIES.map((c) => {
        const muscles = gym.muscles.filter((m) => m.category === c.key)
        if (!muscles.length) return null
        return (
          <Card key={c.key} className="gap-1">
            <CardTitle>{c.label}</CardTitle>
            <div className="flex flex-col">
              {muscles.map((m) => (
                <PanelRow
                  key={m.id}
                  chevron={false}
                  title={m.name}
                  meta={[`×${averageFrequency([], m.id, now).toFixed(1)}`]}
                />
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
