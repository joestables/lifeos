import { formatKg, stepWeight } from '@lifeos/fitness'
import { useNavigate } from '@tanstack/react-router'
import { PlusIcon, Trash2Icon, WrenchIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { EmptyState, ValueStepper } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  CATEGORIES,
  createExercise,
  removeSecondaryMuscle,
  setPrimaryMuscle,
  setSecondaryMuscle,
  updateExercise,
  type ExerciseView,
  type GymData,
  type MuscleView,
} from '@/data'
import { sameName } from '@/lib/gym'
import { Field } from './task-details'

const REPS_RANGE = [1, 100] as const

/** The groups by category, for a Select (GYM-002). */
function MuscleSelect({
  id,
  value,
  muscles,
  placeholder,
  label,
  onChange,
}: {
  id?: string
  /** Its name when no Label names it. */
  label?: string
  value: string
  muscles: readonly MuscleView[]
  placeholder: string
  onChange: (id: string) => void
}) {
  const items = muscles.map((m) => ({ value: m.id, label: m.name }))
  return (
    <Select value={value} items={items} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => {
          const of = muscles.filter((m) => m.category === c.key)
          if (!of.length) return null
          return (
            <SelectGroup key={c.key}>
              <SelectLabel>{c.label}</SelectLabel>
              {of.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}

/**
 * New exercise, or an Exercise edited (GYM-004): its name, equipment,
 * primary muscle, secondaries with their contributions, Current set and
 * setup and form notes. With no equipment yet, it says one is needed first
 * and opens Settings → Gym → Equipment (GYM-001 3).
 */
export function ExerciseDialog({
  exercise,
  gym,
  onClose,
  onMade,
}: {
  exercise?: ExerciseView
  gym: GymData
  onClose: () => void
  onMade?: (id: string) => void
}) {
  const ids = useId()
  const navigate = useNavigate()
  const [name, setName] = useState(exercise?.item.title ?? '')
  const [equipmentId, setEquipmentId] = useState(
    exercise?.equipment?.id ?? gym.equipment[0]?.id ?? '',
  )
  const [primaryId, setPrimaryId] = useState(exercise?.primary?.id ?? '')
  const [secondaries, setSecondaries] = useState(
    (exercise?.secondaries ?? []).map((s) => ({ id: s.muscle.id, contribution: s.contribution })),
  )
  const [adding, setAdding] = useState(false)
  const [weight, setWeight] = useState(exercise?.weightGrams ?? 20_000)
  const [reps, setReps] = useState(exercise?.reps ?? 8)
  const [notes, setNotes] = useState(exercise?.notes ?? '')

  const equipment = gym.equipment.find((e) => e.id === equipmentId)
  const taken = gym.exercises.find(
    (x) => x.item.id !== exercise?.item.id && sameName(x.item.title, name),
  )
  const ready = name.trim() !== '' && !taken && equipment !== undefined && primaryId !== ''
  const free = gym.muscles.filter(
    (m) => m.id !== primaryId && !secondaries.some((s) => s.id === m.id),
  )

  const save = () => {
    if (!ready) return
    if (!exercise) {
      const id = createExercise({
        name,
        equipmentId,
        primaryId,
        weightGrams: weight,
        reps,
        notes,
      })
      for (const s of secondaries) setSecondaryMuscle(id, s.id, s.contribution)
      onMade?.(id)
      onClose()
      return
    }
    const id = exercise.item.id
    const patch = {
      ...(name.trim() !== exercise.item.title && { name }),
      ...(equipmentId !== exercise.equipment?.id && { equipmentId }),
      ...(weight !== exercise.weightGrams && { weightGrams: weight }),
      ...(reps !== exercise.reps && { reps }),
      ...((notes.trim() || null) !== exercise.notes && { notes }),
    }
    if (Object.keys(patch).length) updateExercise(id, patch)
    // Secondaries off first, so a secondary can become the primary (GYM-004 2).
    const kept = new Set(secondaries.map((s) => s.id))
    for (const s of exercise.secondaries)
      if (!kept.has(s.muscle.id)) removeSecondaryMuscle(id, s.muscle.id)
    if (primaryId !== exercise.primary?.id) setPrimaryMuscle(id, primaryId)
    for (const s of secondaries) {
      const was = exercise.secondaries.find((o) => o.muscle.id === s.id)
      if (!was || was.contribution !== s.contribution) setSecondaryMuscle(id, s.id, s.contribution)
    }
    onClose()
  }

  if (!gym.equipment.length && !exercise)
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent data-colour="coral" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New exercise</DialogTitle>
          </DialogHeader>
          <EmptyState icon={WrenchIcon} title="Add your equipment first" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void navigate({ to: '/settings/equipment' })}>
              Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

  const equipmentItems = gym.equipment.map((e) => ({ value: e.id, label: e.name }))
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" list className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{exercise ? 'Edit exercise' : 'New exercise'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              value={name}
              autoFocus={!exercise}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={taken ? true : undefined}
            />
            {taken && (
              <p className="text-sm text-destructive">
                You already have {taken.item.title}
                {taken.archived ? ', archived' : ''}
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Equipment" htmlFor={`${ids}-equipment`}>
              <Select
                value={equipmentId}
                items={equipmentItems}
                onValueChange={(v) => v && setEquipmentId(v)}
              >
                <SelectTrigger id={`${ids}-equipment`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equipmentItems.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Primary muscle" htmlFor={`${ids}-primary`}>
              <MuscleSelect
                id={`${ids}-primary`}
                value={primaryId}
                placeholder="Choose"
                muscles={gym.muscles}
                onChange={(id) => {
                  setPrimaryId(id)
                  setSecondaries((ss) => ss.filter((s) => s.id !== id))
                }}
              />
            </Field>
          </div>
          <Field label="Secondary muscles">
            <div className="flex flex-col gap-1">
              {secondaries.map((s) => {
                const m = gym.muscleById.get(s.id)
                return (
                  <div key={s.id} className="flex h-10 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m?.name}</span>
                    <ValueStepper
                      size="sm"
                      label={`${m?.name ?? 'Muscle'} contribution`}
                      value={s.contribution.toFixed(1)}
                      canDown={s.contribution > 0.1}
                      canUp={s.contribution < 0.9}
                      onStep={(d) =>
                        setSecondaries((ss) =>
                          ss.map((o) =>
                            o.id === s.id
                              ? {
                                  ...o,
                                  contribution: Math.round((o.contribution + d / 10) * 10) / 10,
                                }
                              : o,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Take ${m?.name ?? 'it'} off`}
                      onClick={() => setSecondaries((ss) => ss.filter((o) => o.id !== s.id))}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                )
              })}
              {adding ? (
                <MuscleSelect
                  value=""
                  label="Add a muscle"
                  placeholder="Choose a muscle"
                  muscles={free}
                  onChange={(id) => {
                    setSecondaries((ss) => [...ss, { id, contribution: 0.5 }])
                    setAdding(false)
                  }}
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 self-start"
                  disabled={!free.length}
                  onClick={() => setAdding(true)}
                >
                  <PlusIcon /> Add a muscle
                </Button>
              )}
            </div>
          </Field>
          <Field label="Current">
            <div className="flex flex-wrap items-center gap-2">
              <ValueStepper
                label="Weight"
                value={formatKg(weight)}
                unit="kg"
                canDown={weight > 0}
                onStep={(d) => setWeight(stepWeight(weight, equipment?.incrementGrams ?? 2500, d))}
              />
              <span className="text-muted-foreground">×</span>
              <ValueStepper
                label="Reps"
                value={String(reps)}
                unit="reps"
                canDown={reps > REPS_RANGE[0]}
                canUp={reps < REPS_RANGE[1]}
                onStep={(d) => setReps(reps + d)}
              />
            </div>
          </Field>
          <Field label="Notes" htmlFor={`${ids}-notes`}>
            <Textarea
              id={`${ids}-notes`}
              value={notes}
              maxLength={2000}
              placeholder="Setup / form notes"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
