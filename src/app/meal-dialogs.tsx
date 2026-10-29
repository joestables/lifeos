import { useId, useState } from 'react'
import { DateField } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SLOTS, SLOT_LABEL, type SlotKey } from '@/lib/meals'
import { Field } from './task-details'

const SLOT_ITEMS = SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))

/**
 * A day and a slot for a Meal (patterns.md#meal-plan): Move to…, or Add
 * leftovers…; then Cancel and the action.
 */
export function SlotDialog({
  title,
  action,
  day: startDay,
  slot: startSlot,
  onChoose,
  onClose,
}: {
  title: string
  action: string
  day: string
  slot: SlotKey
  onChoose: (day: string, slot: SlotKey) => void
  onClose: () => void
}) {
  const ids = useId()
  const [day, setDay] = useState(startDay)
  const [slot, setSlot] = useState<SlotKey>(startSlot)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onChoose(day, slot)
            onClose()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day" htmlFor={`${ids}-day`}>
              <DateField id={`${ids}-day`} value={day} onChange={(d) => d && setDay(d)} />
            </Field>
            <Field label="Slot" htmlFor={`${ids}-slot`}>
              <Select
                value={slot}
                items={SLOT_ITEMS}
                onValueChange={(v) => v && setSlot(v as SlotKey)}
              >
                <SelectTrigger id={`${ids}-slot`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_ITEMS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{action}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
