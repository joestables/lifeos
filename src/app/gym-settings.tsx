import { formatKg, type RecoveryType } from '@lifeos/fitness'
import { Link } from '@tanstack/react-router'
import {
  ActivityIcon,
  ArchiveRestoreIcon,
  GaugeIcon,
  RotateCcwIcon,
  TrendingUpIcon,
  WrenchIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { CardRow, StepperField, ValueStepper } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  CATEGORIES,
  queue,
  removeEquipment,
  removeMuscleGroup,
  saveEquipment,
  saveMuscleGroup,
  setMuscleSettings,
  updateGymSettings,
  useGym,
  type EquipmentView,
  type MuscleView,
} from '@/data'
import { parseIncrement, RECOVERY_LABEL, RIR_RANGE, sameName, STALL_RANGE } from '@/lib/gym'
import { Field } from './task-details'

/**
 * Settings → Gym (GYM-020): Preferred RIR and Workouts to stall as
 * steppers; Equipment, Muscle groups, Recovery and Archived exercises open
 * from it.
 */
export function GymCard() {
  const gym = useGym(queue)
  const archived = gym.exercises.filter((x) => x.archived).length
  const { preferredRir, workoutsToStall } = gym.settings
  return (
    <Card className="gap-0 px-2 py-1.5">
      <div className="px-3 pt-2 pb-1">
        <CardTitle>Gym</CardTitle>
      </div>
      <CardRow className="px-3" icon={<GaugeIcon />} label="Preferred RIR" chevron={false}>
        <ValueStepper
          size="sm"
          label="Preferred RIR"
          value={String(preferredRir)}
          canDown={preferredRir > RIR_RANGE[0]}
          canUp={preferredRir < RIR_RANGE[1]}
          onStep={(d) => updateGymSettings({ preferred_rir: preferredRir + d })}
        />
      </CardRow>
      <CardRow className="px-3" icon={<TrendingUpIcon />} label="Workouts to stall" chevron={false}>
        <ValueStepper
          size="sm"
          label="Workouts to stall"
          value={String(workoutsToStall)}
          canDown={workoutsToStall > STALL_RANGE[0]}
          canUp={workoutsToStall < STALL_RANGE[1]}
          onStep={(d) => updateGymSettings({ workouts_to_stall: workoutsToStall + d })}
        />
      </CardRow>
      <CardRow
        icon={<WrenchIcon />}
        label="Equipment"
        value={gym.equipment.length}
        render={<Link to="/settings/equipment" />}
      />
      <CardRow
        icon={<ActivityIcon />}
        label="Muscle groups"
        value={gym.muscles.length}
        render={<Link to="/settings/muscle-groups" />}
      />
      <CardRow
        icon={<RotateCcwIcon />}
        label="Recovery"
        render={<Link to="/settings/recovery" />}
      />
      <CardRow
        icon={<ArchiveRestoreIcon />}
        label="Archived exercises"
        value={archived}
        render={<Link to="/settings/archived-exercises" />}
      />
    </Card>
  )
}

/**
 * A piece of equipment, new or changed (GYM-001): its name and increment.
 * One in use can't be deleted, and says why.
 */
export function EquipmentDialog({
  equipment,
  existing,
  inUse,
  onClose,
}: {
  equipment?: EquipmentView
  existing: readonly EquipmentView[]
  inUse: number
  onClose: () => void
}) {
  const ids = useId()
  const [name, setName] = useState(equipment?.name ?? '')
  const [increment, setIncrement] = useState(equipment ? formatKg(equipment.incrementGrams) : '2.5')
  const grams = parseIncrement(increment)
  const taken = existing.find((e) => e.id !== equipment?.id && sameName(e.name, name))
  const save = () => {
    if (!name.trim() || grams === null || taken) return
    saveEquipment(name, grams, equipment?.id)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{equipment ? equipment.name : 'New equipment'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              value={name}
              maxLength={60}
              autoFocus={!equipment}
              placeholder="Barbell"
              onChange={(e) => setName(e.target.value)}
              aria-invalid={taken ? true : undefined}
            />
            {taken && <p className="text-sm text-destructive">You already have {taken.name}</p>}
          </Field>
          <Field label="Increment (kg)" htmlFor={`${ids}-increment`}>
            <Input
              id={`${ids}-increment`}
              value={increment}
              inputMode="decimal"
              onChange={(e) => setIncrement(e.target.value)}
              aria-invalid={grams === null ? true : undefined}
            />
          </Field>
          {equipment && inUse > 0 && (
            <p className="text-sm text-muted-foreground">
              Used by {inUse === 1 ? '1 exercise' : `${inUse} exercises`}
            </p>
          )}
          <DialogFooter>
            {equipment && (
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                disabled={inUse > 0}
                onClick={() => {
                  removeEquipment(equipment.id)
                  toast(`Deleted "${equipment.name}"`, {
                    action: {
                      label: 'Undo',
                      onClick: () =>
                        saveEquipment(equipment.name, equipment.incrementGrams, equipment.id),
                    },
                  })
                  onClose()
                }}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || grams === null || Boolean(taken)}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const FREQUENCY_RANGE = [0, 14] as const
const STIMULUS_RANGE = [0, 60] as const

/**
 * A muscle group's settings (GYM-002 3, GYM-017 1): how it recovers and its
 * two weekly targets; a group of my own is also named, put in a category,
 * and deleted once no Exercise uses it. A new group starts here too.
 */
export function MuscleGroupDialog({
  muscle,
  muscles,
  inUse,
  onClose,
}: {
  muscle?: MuscleView
  muscles: readonly MuscleView[]
  inUse: boolean
  onClose: () => void
}) {
  const ids = useId()
  const own = !muscle || !muscle.builtIn
  const [name, setName] = useState(muscle?.name ?? '')
  const [category, setCategory] = useState(muscle?.category ?? 'push')
  const [recovery, setRecovery] = useState<RecoveryType>(muscle?.recoveryType ?? 'normal')
  const [frequency, setFrequency] = useState(muscle?.frequencyTarget ?? 2)
  const [stimulus, setStimulus] = useState(muscle?.stimulusTarget ?? 4)
  const taken = own ? muscles.find((m) => m.id !== muscle?.id && sameName(m.name, name)) : undefined
  const ready = !own || (name.trim() !== '' && !taken)
  const save = () => {
    if (!ready) return
    const id =
      own && (!muscle || name.trim() !== muscle.name || category !== muscle.category)
        ? saveMuscleGroup(name, category, muscle?.id)
        : muscle!.id
    if (
      !muscle ||
      recovery !== muscle.recoveryType ||
      frequency !== muscle.frequencyTarget ||
      stimulus !== muscle.stimulusTarget
    )
      setMuscleSettings(id, recovery, frequency, stimulus)
    onClose()
  }
  const categories = CATEGORIES.map((c) => ({ value: c.key, label: c.label }))
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{muscle ? muscle.name : 'New muscle group'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {own && (
            <>
              <Field label="Name" htmlFor={`${ids}-name`}>
                <Input
                  id={`${ids}-name`}
                  value={name}
                  maxLength={40}
                  autoFocus={!muscle}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={taken ? true : undefined}
                />
                {taken && (
                  <p className="text-sm text-destructive">
                    There's already a muscle group called {taken.name}
                  </p>
                )}
              </Field>
              <Field label="Category" htmlFor={`${ids}-category`}>
                <Select
                  value={category}
                  items={categories}
                  onValueChange={(v) => v && setCategory(v)}
                >
                  <SelectTrigger id={`${ids}-category`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field label="Recovers" htmlFor={`${ids}-recovers`}>
            <ToggleGroup
              id={`${ids}-recovers`}
              value={[recovery]}
              onValueChange={(v: string[]) => v[0] && setRecovery(v[0] as RecoveryType)}
              aria-label="Recovers"
              className="grid w-full grid-cols-3 self-stretch"
            >
              {(['fast', 'normal', 'slow'] as const).map((r) => (
                <ToggleGroupItem key={r} value={r} className="justify-center">
                  {RECOVERY_LABEL[r]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <StepperField label="Desired weekly frequency">
            <ValueStepper
              label="Desired weekly frequency"
              value={String(frequency)}
              canDown={frequency > FREQUENCY_RANGE[0]}
              canUp={frequency < FREQUENCY_RANGE[1]}
              onStep={(d) => setFrequency(frequency + d)}
            />
          </StepperField>
          <StepperField label="Stimulus sets a week">
            <ValueStepper
              label="Stimulus sets a week"
              value={String(stimulus)}
              canDown={stimulus > STIMULUS_RANGE[0]}
              canUp={stimulus < STIMULUS_RANGE[1]}
              onStep={(d) => setStimulus(stimulus + d)}
            />
          </StepperField>
          {muscle && own && inUse && (
            <p className="text-sm text-muted-foreground">Used by an exercise</p>
          )}
          <DialogFooter>
            {muscle && own && (
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                disabled={inUse}
                onClick={() => {
                  removeMuscleGroup(muscle.id)
                  toast(`Deleted "${muscle.name}"`)
                  onClose()
                }}
              >
                Delete
              </Button>
            )}
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
