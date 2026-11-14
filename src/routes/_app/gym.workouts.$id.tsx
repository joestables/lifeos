import { addDays, todayIn } from '@lifeos/recurrence'
import { stimulusSets } from '@lifeos/fitness'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftRightIcon,
  ArrowUpIcon,
  CalendarIcon,
  ClipboardListIcon,
  DumbbellIcon,
  EllipsisIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  SquarePenIcon,
  Trash2Icon,
  TrophyIcon,
  UndoIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  CurrentLine,
  DoneToggle,
  EmptyState,
  ExerciseCard,
  FormNotes,
  LogSetButton,
  MotivationBadge,
  PageHeader,
  PanelHeading,
  PanelRow,
  SectionLabel,
  SetTable,
  SideColumns,
  StarRating,
  StatTile,
  StimulusRow,
  TypeScope,
  TypeTile,
  WorkoutStatePill,
} from '@/components/lifeos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { ExerciseDialog } from '@/app/exercise-dialog'
import { ExercisePicker } from '@/app/exercise-picker'
import { Field } from '@/app/task-details'
import {
  LogSetDialog,
  EndWorkoutDialog,
  StrengthHistoryDialog,
  UpdateCurrentDialog,
} from '@/app/workout-dialogs'
import { EMPTY, TemplateChoice } from '@/app/new-workout'
import {
  addEntry,
  archiveItem,
  beginEntry,
  changeWorkoutTemplate,
  markEntryDone,
  positionBetween,
  queue,
  removeWorkoutEntry,
  restoreItem,
  startWorkout,
  swapEntry,
  updateWorkout,
  useGym,
  useSettings,
  type EntryView,
  type ExerciseView,
  type GymData,
  type SetView,
  type WorkoutView,
} from '@/data'
import { dateName, shortDate, fromIsoDay } from '@/lib/dates'
import {
  counted,
  currentText,
  duration,
  pillState,
  setsOf,
  shownSet,
  strengthOfCurrent,
} from '@/lib/gym'
import { motivationOf } from '@lifeos/fitness'

/**
 * A workout (GYM-007–GYM-012): planned, it can be started, moved or
 * deleted; in progress, its session over its backlog, logged on a phone in
 * one column; complete, its review, read-only.
 */
export const Route = createFileRoute('/_app/gym/workouts/$id')({
  component: WorkoutPage,
})

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const clock = (iso: string) => time.format(new Date(iso))

/** A workout's line of facts under its title: its state pill, then muted facts. */
function Facts({ pill, items }: { pill: ReactNode; items: string[] }) {
  return (
    <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground tabular-nums">
      {pill}
      {items.map((t) => (
        <span key={t} className="flex items-center gap-3">
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
          {t}
        </span>
      ))}
    </div>
  )
}

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

type Picking = { kind: 'add' } | { kind: 'swap'; entry: EntryView }

function WorkoutPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const gym = useGym(queue)
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const workout = gym.workouts.find((w) => w.item.id === id)
  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [retemplating, setRetemplating] = useState(false)
  const [ending, setEnding] = useState(false)
  // Correcting a finished workout (GYM-012 6).
  const [editing, setEditing] = useState(false)
  const [blocked, setBlocked] = useState<WorkoutView | null>(null)
  const back = () => void navigate({ to: '/gym' })

  if (!workout)
    return (
      <TypeScope colour="coral">
        <PageHeader title="" back={{ label: 'Workouts', onClick: back }} />
        {!gym.isLoading && <EmptyState icon={DumbbellIcon} title="This workout can't be found" />}
      </TypeScope>
    )

  const state = pillState(workout.stage, workout.item.do_on, today)
  const remove = (discard: boolean) => {
    archiveItem(workout.item.id)
    toast(discard ? `Discarded "${workout.item.title}"` : `Deleted "${workout.item.title}"`, {
      action: { label: 'Undo', onClick: () => restoreItem(workout.item.id) },
    })
    back()
  }
  const start = () => {
    const other = gym.workouts.find((w) => w.stage === 'in_progress' && w.item.id !== id)
    if (other) return setBlocked(other)
    const template = gym.templates.find((t) => t.item.id === workout.templateId)
    // A workout planned empty, or started again after Undo, copies nothing.
    const lines =
      workout.session.length || workout.backlog.length
        ? []
        : (template?.lines ?? []).flatMap((l) =>
            l.exercise && !l.exercise.archived
              ? [{ exerciseId: l.exercise.item.id, position: l.position, sets: l.sets }]
              : [],
          )
    // Trained today, so dated today, whichever day it was planned for (GYM-008 1).
    if (workout.item.do_on !== today) updateWorkout(id, { day: today })
    startWorkout(id, lines)
  }

  let trailing: ReactNode
  if (workout.stage === 'planned')
    trailing = (
      <div className="flex items-center gap-1">
        <Button onClick={start}>Start</Button>
        <More label="Workout">
          <DropdownMenuItem onClick={() => setMoving(true)}>
            <CalendarIcon /> Change day
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRetemplating(true)}>
            <ClipboardListIcon /> Change template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => remove(false)}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </More>
      </div>
    )
  else if (workout.stage === 'in_progress')
    trailing = (
      <div className="flex items-center gap-1">
        <Button onClick={() => setEnding(true)}>End workout</Button>
        <More label="Workout">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => remove(true)}>
            <Trash2Icon /> Discard workout
          </DropdownMenuItem>
        </More>
      </div>
    )
  else if (editing) trailing = <Button onClick={() => setEditing(false)}>Done</Button>
  else
    trailing = (
      <More label="Workout">
        <DropdownMenuItem onClick={() => setEditing(true)}>
          <SquarePenIcon /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setRenaming(true)}>
          <PencilIcon /> Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => remove(false)}>
          <Trash2Icon /> Delete
        </DropdownMenuItem>
      </More>
    )

  const day = workout.item.do_on
  const facts =
    workout.stage === 'planned'
      ? [day ? dateName(day) : '']
      : workout.stage === 'in_progress'
        ? [`Started ${clock(workout.startedAt!)}`, counted(workout.setCount, 'set')]
        : [
            day ? shortDate(fromIsoDay(day)) : '',
            `${clock(workout.startedAt!)}–${clock(workout.endedAt!)}`,
          ]

  return (
    <TypeScope colour="coral">
      <PageHeader
        back={{ label: 'Workouts', onClick: back }}
        title={workout.item.title}
        trailing={trailing}
      />
      <div
        className={
          workout.stage === 'complete'
            ? 'flex flex-col gap-5 px-5 pb-12 sm:px-9'
            : 'flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 md:pb-12'
        }
      >
        <Facts pill={<WorkoutStatePill state={state} />} items={facts.filter(Boolean)} />
        {workout.stage === 'planned' && <Planned workout={workout} gym={gym} />}
        {workout.stage === 'in_progress' && <Session workout={workout} gym={gym} />}
        {workout.stage === 'complete' && (
          <Review workout={workout} gym={gym} editing={editing} onRate={() => setEnding(true)} />
        )}
      </div>
      {renaming && <RenameDialog workout={workout} onClose={() => setRenaming(false)} />}
      {moving && <DayDialog workout={workout} today={today} onClose={() => setMoving(false)} />}
      {retemplating && (
        <TemplateDialog workout={workout} gym={gym} onClose={() => setRetemplating(false)} />
      )}
      {ending && <EndWorkoutDialog workout={workout} onClose={() => setEnding(false)} />}
      <AlertDialog open={blocked !== null} onOpenChange={(o) => !o && setBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blocked?.item.title} is in progress</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                blocked &&
                void navigate({ to: '/gym/workouts/$id', params: { id: blocked.item.id } })
              }
            >
              Open it
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TypeScope>
  )
}

/** A planned workout: its template's exercises, as Start will copy them. */
function Planned({ workout, gym }: { workout: WorkoutView; gym: GymData }) {
  const template = gym.templates.find((t) => t.item.id === workout.templateId)
  const lines = (template?.lines ?? []).filter((l) => l.exercise && !l.exercise.archived)
  return (
    <Card className="gap-1 py-3">
      <PanelHeading title={template ? template.item.title : 'Empty'} />
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add exercises once started</p>
      ) : (
        lines.map((l) => (
          <PanelRow
            key={l.id}
            chevron={false}
            leading={<TypeTile colour="coral" icon={DumbbellIcon} />}
            title={l.exercise!.item.title}
            meta={[l.exercise!.primary?.name ?? '', counted(l.sets, 'set')].filter(Boolean)}
          />
        ))
      )}
    </Card>
  )
}

/**
 * A workout in progress (GYM-008–GYM-011): the session, in the order
 * begun, over the backlog, in one column; Add moves an exercise into the
 * session, open for logging.
 */
function Session({ workout, gym }: { workout: WorkoutView; gym: GymData }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [logging, setLogging] = useState<{ entry: EntryView; set?: SetView } | null>(null)
  const [picking, setPicking] = useState<Picking | null>(null)
  const [history, setHistory] = useState<ExerciseView | null>(null)
  const [editing, setEditing] = useState<ExerciseView | null>(null)
  const toggle = (entry: string, to?: boolean) =>
    setOpen((o) => {
      const next = new Set(o)
      if (to ?? !next.has(entry)) next.add(entry)
      else next.delete(entry)
      return next
    })
  const add = (e: EntryView) => {
    beginEntry(workout.item.id, e.id)
    toggle(e.id, true)
  }
  const remove = (e: EntryView) => {
    removeWorkoutEntry(workout.item.id, e.id)
    toast(`Removed "${e.name}"`, {
      action: {
        label: 'Undo',
        onClick: () =>
          e.exercise &&
          addEntry(workout.item.id, e.exercise.item.id, e.position, false, e.plannedSets),
      },
    })
  }
  // Its exercise's own: Edit exercise (GYM-002), then Strength history.
  const exerciseItems = (e: EntryView) =>
    e.exercise && (
      <>
        <DropdownMenuItem onClick={() => setEditing(e.exercise!)}>
          <PencilIcon /> Edit exercise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setHistory(e.exercise!)}>
          <HistoryIcon /> Strength history
        </DropdownMenuItem>
      </>
    )

  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionLabel count={workout.session.length}>Session</SectionLabel>
        {workout.session.length === 0 && (
          <p className="text-sm text-muted-foreground">Add an exercise from the backlog</p>
        )}
        {workout.session.map((e) => {
          const done = e.doneAt !== null
          const isOpen = open.has(e.id)
          const empty = e.sets.length === 0
          return (
            <ExerciseCard
              key={e.id}
              name={e.name}
              meta={[setsOf(e.sets.length, e.plannedSets)]}
              open={isOpen}
              done={done}
              onToggle={() => toggle(e.id)}
              control={
                <DoneToggle
                  name={e.name}
                  done={done}
                  onChange={(on) => {
                    markEntryDone(workout.item.id, e.id, on)
                    // Done, it closes; it can still be opened to see its sets (GYM-011 2).
                    if (on) toggle(e.id, false)
                  }}
                />
              }
              menu={
                <More label={`${e.name} options`}>
                  {exerciseItems(e)}
                  {empty && (
                    <DropdownMenuItem onClick={() => beginEntry(workout.item.id, e.id, false)}>
                      <UndoIcon /> Back to the backlog
                    </DropdownMenuItem>
                  )}
                  {empty && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => remove(e)}>
                        <Trash2Icon /> Remove
                      </DropdownMenuItem>
                    </>
                  )}
                </More>
              }
            >
              <div className="flex flex-col gap-1.5">
                {e.exercise?.notes && <FormNotes>{e.exercise.notes}</FormNotes>}
                <CurrentLine>{currentText(e.current.weightGrams, e.current.reps)}</CurrentLine>
              </div>
              {e.sets.length > 0 && (
                <SetTable
                  sets={e.sets.map(shownSet)}
                  editable={!done}
                  onEdit={(i) => setLogging({ entry: e, set: e.sets[i] })}
                />
              )}
              {/* Done, its sets are as they are until Done is undone (GYM-011 3). */}
              {!done && <LogSetButton label="Log set" onClick={() => setLogging({ entry: e })} />}
            </ExerciseCard>
          )
        })}
      </section>
      <section className="flex flex-col gap-2">
        <SectionLabel count={workout.backlog.length}>Backlog</SectionLabel>
        <Card className="gap-1 py-3">
          {workout.backlog.map((e) => (
            <PanelRow
              key={e.id}
              chevron={false}
              leading={<TypeTile colour="coral" icon={DumbbellIcon} />}
              title={e.name}
              meta={[e.exercise?.primary?.name ?? '', counted(e.plannedSets, 'set')].filter(
                Boolean,
              )}
              trailing={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Add ${e.name}`}
                    onClick={() => add(e)}
                  >
                    <PlusIcon /> Add
                  </Button>
                  <More label={`${e.name} options`}>
                    {exerciseItems(e)}
                    <DropdownMenuItem onClick={() => setPicking({ kind: 'swap', entry: e })}>
                      <ArrowLeftRightIcon /> Swap…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => remove(e)}>
                      <Trash2Icon /> Remove
                    </DropdownMenuItem>
                  </More>
                </>
              }
            />
          ))}
          <Button
            variant="ghost"
            className="-mx-2 -mb-1 justify-start text-muted-foreground"
            onClick={() => setPicking({ kind: 'add' })}
          >
            <PlusIcon /> Add exercise
          </Button>
        </Card>
      </section>
      {logging && (
        <LogSetDialog
          entry={workout.session.find((e) => e.id === logging.entry.id) ?? logging.entry}
          set={logging.set}
          preferredRir={gym.settings.preferredRir}
          onClose={() => setLogging(null)}
        />
      )}
      {picking && (
        <ExercisePicker
          gym={gym}
          title={picking.kind === 'add' ? 'Add exercise' : `Swap ${picking.entry.name}`}
          subtitle={picking.kind === 'swap' ? picking.entry.exercise?.primary?.name : undefined}
          muscle={picking.kind === 'swap' ? picking.entry.exercise?.primary?.id : undefined}
          except={picking.kind === 'swap' ? [picking.entry.exercise?.item.id ?? ''] : []}
          onPick={(x) =>
            picking.kind === 'add'
              ? addEntry(
                  workout.item.id,
                  x.item.id,
                  positionBetween(workout.backlog.at(-1)?.position, null),
                  false,
                )
              : swapEntry(workout.item.id, picking.entry.id, x.item.id)
          }
          onClose={() => setPicking(null)}
        />
      )}
      {history && (
        <StrengthHistoryDialog gym={gym} exercise={history} onClose={() => setHistory(null)} />
      )}
      {editing && <ExerciseDialog gym={gym} exercise={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

/**
 * A finished workout's review (GYM-012 3–5): its duration, sets and how it
 * went; each exercise in the order done with its Current set and PR, then
 * its sets with their strength and Update current; beside them, the
 * stimulus sets it gave each muscle group.
 */
function Review({
  workout,
  gym,
  editing,
  onRate,
}: {
  workout: WorkoutView
  gym: GymData
  /** Its sets, ratings and notes being corrected (GYM-012 6). */
  editing: boolean
  onRate: () => void
}) {
  const [updating, setUpdating] = useState<{ exercise: ExerciseView; best: SetView } | null>(null)
  const [logging, setLogging] = useState<{ entry: EntryView; set?: SetView } | null>(null)
  // Every exercise begun, its sets or none: one whose last set is deleted stays, to log again.
  const done = workout.session
  const stimulus = stimulusSets(
    done.flatMap((e) =>
      e.exercise
        ? e.sets.map((s) => ({ exerciseId: e.exercise!.item.id, reps: s.reps, rir: s.rir }))
        : [],
    ),
    gym.exerciseMuscles,
  )
  const muscles = gym.muscles
    .filter((m) => (stimulus.get(m.id) ?? 0) > 0)
    .sort((a, b) => (stimulus.get(b.id) ?? 0) - (stimulus.get(a.id) ?? 0))
  const motivation = motivationOf(workout.motivation)
  const main = (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile inset label="Duration" value={duration(workout.startedAt!, workout.endedAt!)} />
          <StatTile inset label="Sets" value={String(workout.setCount)} />
          <StatTile
            inset
            label="How it went"
            value={workout.howItWent ? <StarRating value={workout.howItWent} /> : '–'}
          />
          <StatTile
            inset
            label="Motivation"
            value={
              motivation ? (
                <span className="flex h-7 items-center">
                  <MotivationBadge value={motivation} />
                </span>
              ) : (
                '–'
              )
            }
          />
        </div>
        {workout.notes && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">{workout.notes}</p>
        )}
        {editing && (
          <Button variant="outline" size="sm" className="self-start" onClick={onRate}>
            <PencilIcon /> How it went
          </Button>
        )}
      </Card>
      {done.map((e) => {
        const x = e.exercise
        const best = [...e.sets]
          .filter((s) => s.strength !== null)
          .sort((a, b) => b.strength! - a.strength!)[0]
        const target = x ? strengthOfCurrent(x, gym.settings.preferredRir) : null
        const beat = best && target !== null && best.strength! > target
        return (
          <Card key={e.id} className="gap-4">
            <h2 className="text-h2">{e.name}</h2>
            {x && (
              <div className="grid grid-cols-2 gap-2">
                <StatTile inset label="Current" value={currentText(x.weightGrams, x.reps)} />
                <StatTile
                  inset
                  icon={<TrophyIcon />}
                  label="PR"
                  value={
                    x.pr ? currentText(x.pr.set.weightGrams ?? 0, x.pr.set.reps ?? 0) : 'None yet'
                  }
                  sub={
                    x.pr
                      ? `${x.pr.set.rir} RIR · ${dateName(new Date(x.pr.at).toISOString().slice(0, 10))}`
                      : undefined
                  }
                />
              </div>
            )}
            {e.sets.length ? (
              <SetTable
                sets={e.sets.map(shownSet)}
                strength
                editable={editing}
                onEdit={(i) => setLogging({ entry: e, set: e.sets[i] })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No sets logged</p>
            )}
            {editing && <LogSetButton label="Log set" onClick={() => setLogging({ entry: e })} />}
            {x && best && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpdating({ exercise: x, best })}
                >
                  Update current
                </Button>
                {beat && (
                  <Badge variant="success">
                    <ArrowUpIcon aria-hidden />
                    Beat current
                  </Badge>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
  const stimulusCard = (
    <Card className="gap-2">
      <PanelHeading title="Stimulus sets" />
      {muscles.length === 0 && <p className="text-sm text-muted-foreground">No sets logged</p>}
      {muscles.map((m) => (
        <StimulusRow
          key={m.id}
          muscle={m.name}
          sets={stimulus.get(m.id) ?? 0}
          target={m.stimulusTarget}
        />
      ))}
    </Card>
  )
  return (
    <>
      <SideColumns>
        {main}
        {stimulusCard}
      </SideColumns>
      {updating && (
        <UpdateCurrentDialog
          exercise={updating.exercise}
          best={updating.best}
          onClose={() => setUpdating(null)}
        />
      )}
      {logging && (
        <LogSetDialog
          entry={workout.session.find((e) => e.id === logging.entry.id) ?? logging.entry}
          set={logging.set}
          preferredRir={gym.settings.preferredRir}
          onClose={() => setLogging(null)}
        />
      )}
    </>
  )
}

function RenameDialog({ workout, onClose }: { workout: WorkoutView; onClose: () => void }) {
  const [name, setName] = useState(workout.item.title)
  const save = () => {
    if (!name.trim()) return
    updateWorkout(workout.item.id, { name })
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename workout</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Name" htmlFor="workout-name">
            <Input
              id="workout-name"
              value={name}
              autoFocus
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A planned workout moved to another day (GYM-007 3). */
function DayDialog({
  workout,
  today,
  onClose,
}: {
  workout: WorkoutView
  today: string
  onClose: () => void
}) {
  const [day, setDay] = useState(workout.item.do_on ?? today)
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  if (!days.includes(day)) days.unshift(day)
  const items = days.map((d) => ({ value: d, label: dateName(d) }))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change day</DialogTitle>
        </DialogHeader>
        <Field label="Day" htmlFor="workout-day">
          <Select value={day} items={items} onValueChange={(v) => v && setDay(v)}>
            <SelectTrigger id="workout-day" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              updateWorkout(workout.item.id, { day })
              onClose()
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A planned workout's template changed (GYM-007 3). */
function TemplateDialog({
  workout,
  gym,
  onClose,
}: {
  workout: WorkoutView
  gym: GymData
  onClose: () => void
}) {
  const [template, setTemplate] = useState(workout.templateId ?? EMPTY)
  const titled = (id: string | null) => {
    const t = id ? gym.templates.find((x) => x.item.id === id) : undefined
    return t ? { id: t.item.id, title: t.item.title } : null
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change template</DialogTitle>
        </DialogHeader>
        <TemplateChoice gym={gym} value={template} onChange={setTemplate} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              changeWorkoutTemplate(
                workout.item.id,
                workout.item.title,
                titled(workout.templateId),
                titled(template === EMPTY ? null : template),
              )
              onClose()
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
