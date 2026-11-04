import { coverage } from '@lifeos/fitness'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftRightIcon,
  ClipboardListIcon,
  EllipsisIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import {
  EmptyState,
  ExerciseCard,
  PageHeader,
  PanelHeading,
  SectionLabel,
  SideColumns,
  StimulusRow,
  TypeScope,
  ValueStepper,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { ExercisePicker } from '@/app/exercise-picker'
import { templateMeta } from '@/app/template-actions'
import { TemplateMenu, TemplateNameDialog } from '@/app/template-parts'
import {
  addTemplateExercise,
  CATEGORIES,
  positionBetween,
  queue,
  removeTemplateExercise,
  updateTemplateExercise,
  useGym,
  type TemplateView,
} from '@/data'
import { useReorder } from '@/hooks/use-reorder'

/**
 * A Workout template (GYM-006): its exercises as a workout's cards, each
 * dragged by its handle and with its number of sets, added and swapped by
 * muscle group; beside them its coverage, at my preferred RIR, against
 * each group's weekly target.
 */
export const Route = createFileRoute('/_app/gym/templates/$id')({
  component: TemplatePage,
})

const SETS_RANGE = [1, 20] as const

type Line = TemplateView['lines'][number]

function TemplatePage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const gym = useGym(queue)
  const template = gym.templates.find((t) => t.item.id === id)
  const [picking, setPicking] = useState<'add' | Line | null>(null)
  const [renaming, setRenaming] = useState(false)
  const lines = template?.lines ?? []
  const ids = lines.map((l) => l.id)
  const reorder = useReorder(ids, (moved, to) => {
    const rest = lines.filter((l) => l.id !== moved)
    updateTemplateExercise(id, moved, {
      position: positionBetween(rest[to - 1]?.position, rest[to]?.position),
    })
  })
  const back = () => void navigate({ to: '/gym/templates' })

  if (!template)
    return (
      <TypeScope colour="coral">
        <PageHeader title="" back={{ label: 'All templates', onClick: back }} />
        {!gym.isLoading && (
          <EmptyState icon={ClipboardListIcon} title="This template can't be found" />
        )}
      </TypeScope>
    )

  const covered = coverage(
    lines.flatMap((l) => (l.exercise ? [{ exerciseId: l.exercise.item.id, sets: l.sets }] : [])),
    gym.exerciseMuscles,
    gym.settings.preferredRir,
  )
  const remove = (l: Line) => {
    removeTemplateExercise(id, l.id)
    toast(`Removed "${l.exercise?.item.title ?? 'Exercise'}"`, {
      action: {
        label: 'Undo',
        onClick: () =>
          l.exercise && addTemplateExercise(id, l.exercise.item.id, l.position, l.sets),
      },
    })
  }

  const exercises = (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionLabel count={lines.length}>Exercises</SectionLabel>
      {lines.map((l) => (
        <ExerciseCard
          key={l.id}
          drag
          reorder={reorder.row(l.id)}
          name={l.exercise?.item.title ?? 'Exercise'}
          meta={[l.exercise?.primary?.name, l.exercise?.equipment?.name].filter(Boolean)}
          control={
            <ValueStepper
              size="sm"
              label={`${l.exercise?.item.title ?? 'Exercise'} sets`}
              value={String(l.sets)}
              unit={l.sets === 1 ? 'set' : 'sets'}
              canDown={l.sets > SETS_RANGE[0]}
              canUp={l.sets < SETS_RANGE[1]}
              onStep={(d) => updateTemplateExercise(id, l.id, { sets: l.sets + d })}
            />
          }
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${l.exercise?.item.title ?? 'Exercise'} options`}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPicking(l)}>
                  <ArrowLeftRightIcon /> Swap…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => remove(l)}>
                  <Trash2Icon /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="mt-1 self-start"
        onClick={() => setPicking('add')}
      >
        <PlusIcon /> Add exercise
      </Button>
    </section>
  )

  const coverageCard = (
    <Card className="gap-1">
      <PanelHeading title="Coverage">
        <span className="text-sm text-muted-foreground">at RIR {gym.settings.preferredRir}</span>
      </PanelHeading>
      {covered.size === 0 && <p className="text-sm text-muted-foreground">No exercises yet</p>}
      {CATEGORIES.map((c) => {
        const muscles = gym.muscles.filter(
          (m) => m.category === c.key && (covered.get(m.id) ?? 0) > 0,
        )
        if (!muscles.length) return null
        return (
          <div key={c.key} className="flex flex-col">
            <span className="pt-2 text-xs font-semibold text-muted-foreground">{c.label}</span>
            {muscles.map((m) => (
              <StimulusRow
                key={m.id}
                muscle={m.name}
                sets={covered.get(m.id) ?? 0}
                target={m.stimulusTarget}
              />
            ))}
          </div>
        )
      })}
    </Card>
  )

  return (
    <TypeScope colour="coral">
      <PageHeader
        back={{ label: 'All templates', onClick: back }}
        title={template.item.title}
        trailing={
          <TemplateMenu
            template={template}
            templates={gym.templates}
            workouts={gym.workouts}
            onRename={() => setRenaming(true)}
            onDuplicated={(copy) =>
              void navigate({ to: '/gym/templates/$id', params: { id: copy } })
            }
            onDeleted={back}
          />
        }
      />
      <div className="flex flex-col gap-5 px-5 pb-12 sm:px-9">
        <p className="-mt-2 text-sm text-muted-foreground tabular-nums">
          {templateMeta(template).join(' · ')}
        </p>
        <SideColumns>
          {exercises}
          {coverageCard}
        </SideColumns>
      </div>
      {picking && (
        <ExercisePicker
          gym={gym}
          title={picking === 'add' ? 'Add exercise' : `Swap ${picking.exercise?.item.title ?? ''}`}
          subtitle={picking === 'add' ? undefined : picking.exercise?.primary?.name}
          muscle={picking === 'add' ? undefined : picking.exercise?.primary?.id}
          except={picking === 'add' ? [] : [picking.exercise?.item.id ?? '']}
          onPick={(x) =>
            picking === 'add'
              ? addTemplateExercise(id, x.item.id, positionBetween(lines.at(-1)?.position, null))
              : updateTemplateExercise(id, picking.id, { exerciseId: x.item.id })
          }
          onClose={() => setPicking(null)}
        />
      )}
      {renaming && (
        <TemplateNameDialog
          template={template}
          templates={gym.templates}
          onClose={() => setRenaming(false)}
        />
      )}
    </TypeScope>
  )
}
