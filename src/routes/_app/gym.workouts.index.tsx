import { todayIn } from '@lifeos/recurrence'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DumbbellIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useId, useState } from 'react'
import {
  DateField,
  EmptyState,
  FilterLayout,
  FilterDialog,
  FilterPanel,
  FilterSection,
  PageHeader,
  PanelRow,
  RangeFilter,
  SortMenu,
  StatTile,
  TypeScope,
  WorkoutStatePill,
  type FilterGroup,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useWorkoutFilter, useWorkoutRows, workoutMeta, type WorkoutRow } from '@/app/all-workouts'
import { WorkoutTile } from '@/app/workout-cards'
import { queue, useGym, useSettings, type GymData } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  counted,
  filterWorkouts,
  minutesText,
  NO_TEMPLATE,
  PILL_STATES,
  sortWorkouts,
  workoutAverages,
  WORKOUT_SORTS,
  WORKOUTS_PER_PAGE,
  type Range,
  type WorkoutFilter,
  type WorkoutSort,
} from '@/lib/gym'

/** All workouts (GYM-013 2–5): filters, a sort, three figures, and pages. */
export const Route = createFileRoute('/_app/gym/workouts/')({ component: AllWorkouts })

const MOTIVATIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Okay' },
  { value: 3, label: 'High' },
]

type RangeKey = 'sets' | 'stimulus' | 'exercisesDone' | 'duration' | 'went'

/** Each range's group: its name, its ends from the workouts there are, and how it reads. */
function ranges(rows: readonly WorkoutRow[]) {
  const most = (of: (r: WorkoutRow) => number | null, floor: number, step = 1) =>
    Math.max(floor, Math.ceil(Math.max(0, ...rows.map((r) => of(r) ?? 0)) / step) * step)
  return [
    { key: 'sets', name: 'Sets logged', min: 0, max: most((r) => r.sets, 10) },
    { key: 'stimulus', name: 'Stimulus sets', min: 0, max: most((r) => r.stimulus, 10) },
    { key: 'exercisesDone', name: 'Exercises done', min: 0, max: most((r) => r.exercisesDone, 5) },
    {
      key: 'duration',
      name: 'Duration',
      min: 0,
      max: most((r) => r.minutes, 60, 5),
      step: 5,
      format: minutesText,
    },
    { key: 'went', name: 'How it went', min: 1, max: 5, format: (n: number) => `${n} ★` },
  ] as const satisfies readonly {
    key: RangeKey
    name: string
    min: number
    max: number
    step?: number
    format?: (n: number) => string
  }[]
}

type Option = { id: string; name: string }

/** The templates, exercises and muscle groups to filter by: the current ones, and those in workouts. */
function filterOptions(gym: GymData, rows: readonly WorkoutRow[]) {
  const templates: Option[] = [
    ...gym.templates.map((t) => ({ id: t.item.id, name: t.item.title })),
    { id: NO_TEMPLATE, name: 'None' },
  ]
  const used = new Set(rows.flatMap((r) => r.exerciseIds))
  const exercises: Option[] = gym.exercises
    .filter((x) => used.has(x.item.id))
    .map((x) => ({ id: x.item.id, name: x.item.title }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const trained = new Set(rows.flatMap((r) => r.muscleIds))
  const muscles: Option[] = gym.muscles
    .filter((m) => trained.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }))
  return { templates, exercises, muscles }
}

/**
 * The kept filter, less any template, exercise or muscle group no longer
 * offered (deleted, or in no workout now), so nothing hidden narrows the list.
 */
function shownFilter(filter: WorkoutFilter, options: ReturnType<typeof filterOptions>) {
  const keep = (chosen: readonly string[], all: readonly Option[]) =>
    chosen.filter((id) => all.some((o) => o.id === id))
  return {
    ...filter,
    templates: keep(filter.templates, options.templates),
    exercises: keep(filter.exercises, options.exercises),
    muscles: keep(filter.muscles, options.muscles),
  }
}

function WorkoutFilters({
  gym,
  rows,
  filter,
  change,
  reset,
  bare = false,
}: {
  gym: GymData
  rows: readonly WorkoutRow[]
  filter: WorkoutFilter
  change: (patch: Partial<WorkoutFilter>) => void
  reset: () => void
  bare?: boolean
}) {
  const ids = useId()
  const { templates, exercises, muscles } = filterOptions(gym, rows)
  const names = (all: readonly { id: string; name: string }[], chosen: readonly string[]) =>
    all.filter((o) => chosen.includes(o.id)).map((o) => o.name)
  const idsOf = (all: readonly { id: string; name: string }[], chosen: readonly string[]) =>
    all.filter((o) => chosen.includes(o.name)).map((o) => o.id)
  const rangeGroups: FilterGroup[] = ranges(rows).map((g) => {
    const format: (n: number) => string = 'format' in g ? g.format : String
    const value: Range = filter[g.key] ?? [g.min, g.max]
    return {
      name: g.name,
      values: [],
      summary: filter[g.key] ? `${format(value[0])}–${format(value[1])}` : undefined,
      control: (
        <RangeFilter
          label={g.name}
          min={g.min}
          max={g.max}
          step={'step' in g ? g.step : 1}
          value={[Math.max(g.min, value[0]), Math.min(g.max, value[1])]}
          format={format}
          onChange={([lo, hi]) => change({ [g.key]: lo <= g.min && hi >= g.max ? null : [lo, hi] })}
        />
      ),
    }
  })
  const [sets, stimulus, done, length, went] = rangeGroups
  const groups: FilterGroup[] = [
    {
      name: 'State',
      values: PILL_STATES.map((s) => s.label),
      chosen: PILL_STATES.filter((s) => filter.states.includes(s.value)).map((s) => s.label),
      open: true,
    },
    {
      name: 'Template',
      values: templates.map((t) => t.name),
      chosen: names(templates, filter.templates),
      open: true,
    },
    sets!,
    stimulus!,
    done!,
    length!,
    {
      name: 'Exercise',
      values: exercises.map((x) => x.name),
      chosen: names(exercises, filter.exercises),
    },
    {
      name: 'Muscle trained',
      values: muscles.map((m) => m.name),
      chosen: names(muscles, filter.muscles),
    },
    went!,
    {
      name: 'Motivation',
      values: MOTIVATIONS.map((m) => m.label),
      chosen: MOTIVATIONS.filter((m) => filter.motivation.includes(m.value)).map((m) => m.label),
    },
  ]
  const onChange = (group: string, chosen: string[]) => {
    if (group === 'State')
      change({ states: PILL_STATES.filter((s) => chosen.includes(s.label)).map((s) => s.value) })
    else if (group === 'Template') change({ templates: idsOf(templates, chosen) })
    else if (group === 'Exercise') change({ exercises: idsOf(exercises, chosen) })
    else if (group === 'Muscle trained') change({ muscles: idsOf(muscles, chosen) })
    else if (group === 'Motivation')
      change({
        motivation: MOTIVATIONS.filter((m) => chosen.includes(m.label)).map((m) => m.value),
      })
  }
  return (
    <FilterPanel
      bare={bare}
      groups={groups}
      onChange={onChange}
      onReset={reset}
      active={
        filter.from !== null ||
        filter.to !== null ||
        groups.some((g) => g.chosen?.length || g.summary)
      }
    >
      <FilterSection title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-from`}>From</Label>
            <DateField
              id={`${ids}-from`}
              value={filter.from}
              onChange={(from) => change({ from })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-to`}>To</Label>
            <DateField id={`${ids}-to`} value={filter.to} onChange={(to) => change({ to })} />
          </div>
        </div>
      </FilterSection>
    </FilterPanel>
  )
}

/** How many filters are chosen, for the Filters button where the panel doesn't fit. */
function chosenCount(f: WorkoutFilter): number {
  return (
    f.states.length +
    f.templates.length +
    f.exercises.length +
    f.muscles.length +
    f.motivation.length +
    [f.from, f.to, f.sets, f.stimulus, f.exercisesDone, f.duration, f.went].filter(
      (x) => x !== null,
    ).length
  )
}

function AllWorkouts() {
  const navigate = useNavigate()
  const gym = useGym(queue)
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const phone = useIsMobile()
  const rows = useWorkoutRows(gym, today)
  const kept = useWorkoutFilter()
  const { change, reset } = kept
  // Until the workouts have loaded, keep what was chosen as it is.
  const filter = gym.isLoading ? kept.filter : shownFilter(kept.filter, filterOptions(gym, rows))
  const [page, setPage] = useState(1)
  const [sheet, setSheet] = useState(false)
  const shownRows = sortWorkouts(filterWorkouts(rows, filter), filter.sort, filter.direction)
  const pages = Math.max(1, Math.ceil(shownRows.length / WORKOUTS_PER_PAGE))
  const at = Math.min(page, pages)
  const shown = shownRows.slice((at - 1) * WORKOUTS_PER_PAGE, at * WORKOUTS_PER_PAGE)
  const averages = workoutAverages(shownRows, today, filter)
  const chosen = chosenCount(filter)
  const filters = (bare: boolean) => (
    <WorkoutFilters
      gym={gym}
      rows={rows}
      filter={filter}
      change={(patch) => {
        change(patch)
        setPage(1)
      }}
      reset={() => {
        reset()
        setPage(1)
      }}
      bare={bare}
    />
  )

  const content = (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Average sets" value={averages.sets} />
        <StatTile label="Average duration" value={averages.duration} />
        <StatTile label="Weekly sessions" value={averages.weekly} />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-muted-foreground tabular-nums">
          {counted(shownRows.length, 'workout')}
        </span>
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSheet(true)}>
          <SlidersHorizontalIcon /> Filters
          {chosen > 0 && <Badge variant="secondary">{chosen}</Badge>}
        </Button>
        <SortMenu<WorkoutSort>
          options={WORKOUT_SORTS}
          value={filter.sort}
          direction={filter.direction}
          onChange={(sort, direction) => change({ sort, direction })}
        />
      </div>
      {!gym.isLoading && shownRows.length === 0 ? (
        <EmptyState
          icon={DumbbellIcon}
          title={rows.length ? 'No workouts match' : 'No workouts yet'}
        />
      ) : (
        <Card className="gap-0 py-3">
          {shown.map((r) => (
            <PanelRow
              key={r.id}
              leading={<WorkoutTile />}
              title={r.name}
              meta={workoutMeta(r.view, phone)}
              trailing={<WorkoutStatePill state={r.state} />}
              onOpen={() => void navigate({ to: '/gym/workouts/$id', params: { id: r.id } })}
            />
          ))}
        </Card>
      )}
      {pages > 1 && (
        <Pagination className="justify-center pt-1">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={at === 1}
                onClick={() => setPage(Math.max(1, at - 1))}
              />
            </PaginationItem>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <PaginationItem key={n}>
                <PaginationLink isActive={n === at} onClick={() => setPage(n)}>
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                aria-disabled={at === pages}
                onClick={() => setPage(Math.min(pages, at + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  )

  return (
    <TypeScope colour="coral">
      <PageHeader
        back={{ label: 'Gym', onClick: () => void navigate({ to: '/gym' }) }}
        title="All workouts"
      />
      <div className="flex flex-col gap-4 px-5 pb-28 sm:px-9 md:pb-12">
        <FilterLayout filters={filters(false)}>{content}</FilterLayout>
      </div>
      <FilterDialog
        open={sheet}
        onOpenChange={setSheet}
        colour="coral"
        onReset={() => {
          reset()
          setPage(1)
        }}
        show={shownRows.length === 1 ? 'Show 1 workout' : `Show ${shownRows.length} workouts`}
      >
        {filters(true)}
      </FilterDialog>
    </TypeScope>
  )
}
