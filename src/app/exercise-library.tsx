import { currentStrength, formatKg } from '@lifeos/fitness'
import {
  ArchiveIcon,
  EllipsisIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  TrophyIcon,
  WeightIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  FilterPanel,
  PanelRow,
  SortMenu,
  StatTile,
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/ui/sonner'
import { archiveExercise, CATEGORIES, type ExerciseView, type GymData } from '@/data'
import {
  currentText,
  LIBRARY_SORTS,
  since,
  withShare,
  type LibraryFilter,
  type LibrarySort,
} from '@/lib/gym'
import { whenAgo } from '@/lib/dates'
import type { SortDirection } from '@/lib/sort'
import type { Kept } from './gym-library'
import { SearchField } from './search-field'

const GROUP = { muscles: 'Muscle group', categories: 'Category', equipment: 'Equipment' } as const

/**
 * The exercise library's list (GYM-003): a search, filters (in a Sheet) and
 * a sort, then each Exercise with its primary muscle and when last done.
 */
export function ExerciseList({
  gym,
  filter,
  change,
  setSearch,
  shown,
  selected,
  onOpen,
}: {
  gym: GymData
  filter: LibraryFilter
  change: (patch: Partial<Kept>) => void
  setSearch: (s: string) => void
  shown: readonly ExerciseView[]
  selected?: string
  onOpen: (x: ExerciseView) => void
}) {
  const [sheet, setSheet] = useState(false)
  const chosen = filter.muscles.length + filter.categories.length + filter.equipment.length
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
  ]
  const onChange = (group: string, values: string[]) => {
    if (group === GROUP.muscles) change({ muscles: values })
    else if (group === GROUP.categories)
      change({
        categories: CATEGORIES.filter((c) => values.includes(c.label)).map((c) => c.key),
      })
    else change({ equipment: values })
  }
  const reset = () => change({ muscles: [], categories: [], equipment: [] })
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
              leading={<TypeTile colour="coral" icon={WeightIcon} />}
              title={x.item.title}
              meta={[
                x.primary?.name ?? 'No muscle',
                x.lastDone === null ? 'Never done' : since('Done', x.lastDone),
              ]}
              onOpen={() => onOpen(x)}
            />
          ))}
        </div>
      )}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="right" initialFocus={false} data-colour="coral">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div>
            <FilterPanel bare groups={groups} onChange={onChange} onReset={reset} />
          </div>
          <SheetFooter className="grid grid-cols-2">
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button onClick={() => setSheet(false)}>
              {shown.length === 1 ? 'Show 1 exercise' : `Show ${shown.length} exercises`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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

/**
 * An Exercise's figures (GYM-014 3): its Current set with its strength at
 * my preferred RIR, its PR and when it was last done. Its chart and best
 * sets come with plan step 10.
 */
export function ExerciseFigures({
  exercise,
  preferredRir,
}: {
  exercise: ExerciseView
  preferredRir: number
}) {
  const s = currentStrength(
    { weightGrams: exercise.weightGrams, reps: exercise.reps },
    preferredRir,
  )
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {/* On a phone the Current set has the row to itself. */}
      <div className="col-span-2 grid md:col-span-1">
        <StatTile
          label="Current"
          value={currentText(exercise.weightGrams, exercise.reps)}
          sub={s === null ? undefined : `Strength ${s.toFixed(1)} at ${preferredRir} RIR`}
        />
      </div>
      <StatTile
        icon={<TrophyIcon />}
        label="PR"
        value={
          exercise.pr
            ? currentText(exercise.pr.set.weightGrams ?? 0, exercise.pr.set.reps ?? 0)
            : 'None yet'
        }
        sub={exercise.pr ? `Strength ${exercise.pr.strength.toFixed(1)}` : undefined}
      />
      <StatTile
        label="Last done"
        value={
          exercise.lastDone === null ? 'Never' : whenAgo(new Date(exercise.lastDone).toISOString())
        }
      />
    </div>
  )
}

/** An Exercise beside the library on a computer (GYM-003 4). */
export function ExerciseDetail({
  exercise,
  preferredRir,
  onEdit,
  onArchived,
}: {
  exercise: ExerciseView
  preferredRir: number
  onEdit: () => void
  onArchived?: () => void
}) {
  return (
    <>
      <Card className="gap-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-h2">{exercise.item.title}</h2>
            <ExerciseBadges exercise={exercise} />
          </div>
          <ExerciseMenu exercise={exercise} onEdit={onEdit} onArchived={onArchived} />
        </div>
        {exercise.notes && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">{exercise.notes}</p>
        )}
      </Card>
      <ExerciseFigures exercise={exercise} preferredRir={preferredRir} />
    </>
  )
}
