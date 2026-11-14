import { formatKg } from '@lifeos/fitness'
import {
  ArchiveIcon,
  EllipsisIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  DumbbellIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  FilterDialog,
  FilterPanel,
  PanelRow,
  SortMenu,
  TypeBadge,
  TypeTile,
  type FilterGroup,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { archiveExercise, CATEGORIES, type ExerciseView, type GymData } from '@/data'
import { LIBRARY_SORTS, since, withShare, type LibraryFilter, type LibrarySort } from '@/lib/gym'
import type { SortDirection } from '@/lib/sort'
import type { Kept } from './gym-library'
import { ExerciseProgress } from './progression-parts'
import type { Period } from './progression'
import { SearchField } from './search-field'

const GROUP = {
  muscles: 'Muscle group',
  categories: 'Category',
  equipment: 'Equipment',
  templates: 'Template',
} as const

/**
 * The exercise library's list (GYM-003): a search, filters (in a FilterDialog on a phone) and
 * a sort, then each Exercise with its primary muscle and when last done.
 */
export function ExerciseList({
  gym,
  filter,
  change,
  setSearch,
  shown,
  selected,
  stalled,
  onOpen,
}: {
  gym: GymData
  filter: LibraryFilter
  change: (patch: Partial<Kept>) => void
  setSearch: (s: string) => void
  shown: readonly ExerciseView[]
  selected?: string
  /** Exercises marked Stalled (GYM-014 5). */
  stalled?: ReadonlySet<string>
  onOpen: (x: ExerciseView) => void
}) {
  const [sheet, setSheet] = useState(false)
  // Templates no longer there drop out of the kept filter's count.
  const templates = gym.templates.filter((t) => filter.templates.includes(t.item.id))
  const chosen =
    filter.muscles.length + filter.categories.length + filter.equipment.length + templates.length
  const groups: FilterGroup[] = [
    {
      name: GROUP.muscles,
      values: gym.muscles.map((m) => m.name),
      chosen: [...filter.muscles],
    },
    {
      name: GROUP.categories,
      values: CATEGORIES.map((c) => c.label),
      chosen: CATEGORIES.filter((c) => filter.categories.includes(c.key)).map((c) => c.label),
      open: true,
    },
    {
      name: GROUP.equipment,
      values: gym.equipment.map((e) => e.name),
      chosen: [...filter.equipment],
    },
    {
      name: GROUP.templates,
      values: gym.templates.map((t) => t.item.title),
      chosen: templates.map((t) => t.item.title),
    },
  ]
  const onChange = (group: string, values: string[]) => {
    if (group === GROUP.muscles) change({ muscles: values })
    else if (group === GROUP.categories)
      change({
        categories: CATEGORIES.filter((c) => values.includes(c.label)).map((c) => c.key),
      })
    else if (group === GROUP.templates)
      change({
        templates: gym.templates.filter((t) => values.includes(t.item.title)).map((t) => t.item.id),
      })
    else change({ equipment: values })
  }
  const reset = () => change({ muscles: [], categories: [], equipment: [], templates: [] })
  return (
    <Card className="gap-3">
      <div className="flex items-center gap-2">
        <SearchField label="Search exercises" value={filter.search} onChange={setSearch} />
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
        <SortMenu<LibrarySort>
          options={LIBRARY_SORTS}
          value={filter.sort}
          direction={filter.direction}
          onChange={(sort, direction: SortDirection) => change({ sort, direction })}
        />
      </div>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {gym.exercises.some((x) => !x.archived) ? 'No exercises match' : 'No exercises yet'}
        </p>
      ) : (
        <div className="flex flex-col">
          {shown.map((x) => (
            <PanelRow
              key={x.item.id}
              selected={selected === x.item.id}
              leading={<TypeTile colour="coral" icon={DumbbellIcon} />}
              title={x.item.title}
              meta={[
                x.primary?.name ?? 'No muscle',
                x.lastDone === null ? 'Never done' : since('Done', x.lastDone),
              ]}
              trailing={
                stalled?.has(x.item.id) ? <Badge variant="warning">Stalled</Badge> : undefined
              }
              onOpen={() => onOpen(x)}
            />
          ))}
        </div>
      )}
      <FilterDialog
        open={sheet}
        onOpenChange={setSheet}
        colour="coral"
        onReset={reset}
        show={shown.length === 1 ? 'Show 1 exercise' : `Show ${shown.length} exercises`}
      >
        <FilterPanel bare groups={groups} onChange={onChange} onReset={reset} />
      </FilterDialog>
    </Card>
  )
}

/** Edit and Archive, in an Exercise's "…" (GYM-003 4). */
export function ExerciseMenu({
  exercise,
  onEdit,
  onArchived,
}: {
  exercise: ExerciseView
  onEdit: () => void
  onArchived?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Exercise" />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            archiveExercise(exercise.item.id)
            toast(`Archived "${exercise.item.title}"`, {
              action: { label: 'Undo', onClick: () => archiveExercise(exercise.item.id, false) },
            })
            onArchived?.()
          }}
        >
          <ArchiveIcon /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Its muscles, primary first (coral), secondaries with their share, and its equipment. */
export function ExerciseBadges({ exercise }: { exercise: ExerciseView }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {exercise.primary && <TypeBadge colour="coral">{exercise.primary.name}</TypeBadge>}
      {exercise.secondaries.map((s) => (
        <Badge key={s.muscle.id} variant="secondary">
          {withShare(s.muscle.name, s.contribution)}
        </Badge>
      ))}
      {exercise.equipment && (
        <Badge variant="outline">
          {exercise.equipment.name} · {formatKg(exercise.equipment.incrementGrams)} kg
        </Badge>
      )}
    </div>
  )
}

/** An Exercise beside the library on a computer (GYM-003 4). */
export function ExerciseDetail({
  exercise,
  gym,
  period,
  now,
  stalled,
  onEdit,
  onArchived,
}: {
  exercise: ExerciseView
  gym: GymData
  period: Period
  now: number
  stalled: boolean
  onEdit: () => void
  onArchived?: () => void
}) {
  return (
    <>
      <Card className="gap-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="flex items-center gap-2 text-h2">
              {exercise.item.title}
              {stalled && <Badge variant="warning">Stalled</Badge>}
            </h2>
            <ExerciseBadges exercise={exercise} />
          </div>
          <ExerciseMenu exercise={exercise} onEdit={onEdit} onArchived={onArchived} />
        </div>
        {exercise.notes && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">{exercise.notes}</p>
        )}
      </Card>
      <ExerciseProgress gym={gym} exercise={exercise} period={period} now={now} />
    </>
  )
}
