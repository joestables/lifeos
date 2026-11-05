import { addDays } from '@lifeos/recurrence'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { planWorkout, type GymData } from '@/data'
import { dateName, fromIsoDay, shortDate } from '@/lib/dates'
import { counted, sortTemplates } from '@/lib/gym'
import { Field } from './task-details'

/** The choice of no template. */
export const EMPTY = 'empty'
/** Days to plan for: today and the next two weeks. */
const DAYS = 14

/**
 * New workout (GYM-007 1): the three templates used most recently as cards,
 * Empty, and Another template… for the rest; then the day, today to start.
 */
export function NewWorkoutDialog({
  gym,
  today,
  day: startDay,
  template: startTemplate,
  onClose,
  onMade,
}: {
  gym: GymData
  today: string
  /** The day to start at (Plan's day). */
  day?: string
  /** The template to start at (the suggestion, GYM-018 3). */
  template?: string
  onClose: () => void
  onMade: (id: string) => void
}) {
  const ids = useId()
  // Until I choose, the suggestion or the template used most recently,
  // worked out as the templates load (they may arrive after this opens).
  const [chosen, setTemplate] = useState<string | undefined>(startTemplate)
  const template = chosen ?? recentTemplates(gym)[0]?.item.id ?? EMPTY
  const [day, setDay] = useState(startDay && startDay >= today ? startDay : today)
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i))
  if (!days.includes(day)) days.push(day)
  const dayItems = days.map((d) => ({
    value: d,
    label: d === today ? `Today, ${shortDate(fromIsoDay(d))}` : dateName(d),
  }))
  const plan = () => {
    onMade(planWorkout(day, template === EMPTY ? undefined : template))
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="coral" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New workout</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <TemplateChoice gym={gym} value={template} onChange={setTemplate} />
          <Field label="Day" htmlFor={`${ids}-day`}>
            <Select value={day} items={dayItems} onValueChange={(v) => v && setDay(v)}>
              <SelectTrigger id={`${ids}-day`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayItems.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={plan}>Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Templates, the one used most recently first. */
function recentTemplates(gym: GymData) {
  return sortTemplates(
    gym.templates.map((t) => ({ ...t, name: t.item.title, usesThisMonth: 0 })),
    'recent',
    'desc',
  )
}

/**
 * A workout's template (GYM-007 1, 3): the three used most recently as
 * cards, with Empty, and Another template… choosing any other.
 */
export function TemplateChoice({
  gym,
  value,
  onChange,
}: {
  gym: GymData
  /** A template's id, or EMPTY. */
  value: string
  onChange: (value: string) => void
}) {
  const recent = recentTemplates(gym)
  const cards = recent.slice(0, 3)
  const otherItems = recent.slice(3).map((t) => ({ value: t.item.id, label: t.item.title }))
  return (
    <Field label="Template">
      <RadioGroup
        value={cards.some((t) => t.item.id === value) || value === EMPTY ? value : ''}
        onValueChange={(v) => onChange(String(v))}
        className="grid gap-2 sm:grid-cols-2"
      >
        {cards.map((t) => (
          <RadioCard
            key={t.item.id}
            value={t.item.id}
            title={t.item.title}
            description={`${counted(t.exerciseCount, 'exercise')} · ${counted(t.setCount, 'set')}`}
          />
        ))}
        <RadioCard value={EMPTY} title="Empty" description="Add exercises as you go" />
      </RadioGroup>
      {otherItems.length > 0 && (
        <Select
          value={otherItems.some((o) => o.value === value) ? value : ''}
          items={otherItems}
          onValueChange={(v) => v && onChange(v)}
        >
          <SelectTrigger aria-label="Another template" className="w-full">
            <SelectValue placeholder="Another template…" />
          </SelectTrigger>
          <SelectContent>
            {otherItems.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}
