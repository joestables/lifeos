import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DateField } from './DateField'
import { TimeField } from './TimeField'

/** An Event's times as its fields show them: days, and times unless it is all day. */
export interface EventTimesValue {
  allDay: boolean
  startDay: string
  startTime: string
  endDay: string
  endTime: string
}

/**
 * An Event's Starts and Ends (components.md#eventdetails): each a DateField
 * and, unless all day, a TimeField; side by side on a computer, one above
 * the other on a phone; then the "All day" Switch. An end before the start
 * is shown as wrong and not kept (EVT-001 2).
 */
export function EventTimesField({
  value,
  onStart,
  onEnd,
  onAllDay,
  endInvalid = false,
}: {
  value: EventTimesValue
  onStart: (day: string, time: string) => void
  onEnd: (day: string, time: string) => void
  onAllDay: (allDay: boolean) => void
  endInvalid?: boolean
}) {
  const ids = useId()
  const row = (
    which: 'start' | 'end',
    label: string,
    day: string,
    time: string,
    set: (day: string, time: string) => void,
  ) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={`${ids}-${which}`}>{label}</Label>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
        <DateField id={`${ids}-${which}`} value={day} onChange={(d) => d && set(d, time)} />
        {!value.allDay && (
          <TimeField
            aria-label={`${label} time`}
            aria-invalid={which === 'end' && endInvalid ? true : undefined}
            value={time}
            onChange={(t) => t && set(day, t)}
          />
        )}
      </div>
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {row('start', 'Starts', value.startDay, value.startTime, onStart)}
        {row('end', 'Ends', value.endDay, value.endTime, onEnd)}
      </div>
      {endInvalid && (
        <p role="alert" className="text-sm text-destructive">
          It ends before it starts
        </p>
      )}
      <label className="flex items-center gap-3 text-sm font-semibold">
        <Switch checked={value.allDay} onCheckedChange={onAllDay} />
        All day
      </label>
    </div>
  )
}
