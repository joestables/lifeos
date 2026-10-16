import {
  describeRule,
  formatRule,
  parseRule,
  WEEKDAYS,
  weekdayOf,
  type Frequency,
  type Rule,
  type Weekday,
} from '@lifeos/recurrence'
import { ChevronDownIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fieldClasses, Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { DateField } from './DateField'

export type RepeatMode = 'schedule' | 'after_completion'

/** How a Task repeats: a mode and an RRULE (TSK-008, TSK-009). */
export interface Repeat {
  mode: RepeatMode
  rule: string
}

const UNITS: { value: Frequency; one: string; many: string }[] = [
  { value: 'daily', one: 'Day', many: 'Days' },
  { value: 'weekly', one: 'Week', many: 'Weeks' },
  { value: 'monthly', one: 'Month', many: 'Months' },
  { value: 'yearly', one: 'Year', many: 'Years' },
]
const DAY_LETTER: Record<Weekday, [string, string]> = {
  MO: ['M', 'Monday'],
  TU: ['T', 'Tuesday'],
  WE: ['W', 'Wednesday'],
  TH: ['T', 'Thursday'],
  FR: ['F', 'Friday'],
  SA: ['S', 'Saturday'],
  SU: ['S', 'Sunday'],
}
const NTH = ['first', 'second', 'third', 'fourth']

type MonthlyOn = 'date' | 'nth' | 'last-weekday' | 'last-day'
type Ends = 'never' | 'on' | 'after'

/** The editor's state, from a repeat or the defaults for a day. */
function initial(value: Repeat | null, startsOn: string) {
  const rule: Rule = value
    ? parseRule(value.rule)
    : { frequency: 'weekly', interval: 1, byDay: [{ day: WEEKDAYS[weekdayOf(startsOn)]! }] }
  const nth = rule.byDay.find((d) => d.nth !== undefined)?.nth
  return {
    mode: value?.mode ?? ('schedule' as RepeatMode),
    frequency: rule.frequency,
    every: String(rule.interval),
    days:
      rule.frequency === 'weekly' && rule.byDay.length > 0
        ? rule.byDay.map((d) => d.day)
        : [WEEKDAYS[weekdayOf(startsOn)]!],
    monthlyOn: (nth === -1
      ? 'last-weekday'
      : nth !== undefined
        ? 'nth'
        : rule.byMonthDay === -1
          ? 'last-day'
          : 'date') as MonthlyOn,
    ends: (rule.count !== undefined ? 'after' : rule.until ? 'on' : 'never') as Ends,
    until: rule.until ?? null,
    count: String(rule.count ?? 10),
  }
}

/**
 * A Task's or an Event's repeat (components.md): looks like a Select, says
 * the repeat in words ("Every Monday") or "None", and opens the Repeat
 * dialog. An Event repeats on a schedule only (EVT-004), so it isn't asked.
 */
export function RepeatField({
  id,
  value,
  startsOn,
  describeFrom = startsOn,
  scheduleOnly = false,
  onChange,
}: {
  id?: string
  value: Repeat | null
  /** The day a new or changed repeat starts from. */
  startsOn: string
  /** The day the current repeat started, for saying it. */
  describeFrom?: string
  /** On a schedule only: an Event's. */
  scheduleOnly?: boolean
  /** A repeat, or null to stop repeating. */
  onChange: (repeat: Repeat | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className={cn(
          fieldClasses,
          'flex h-10 cursor-pointer items-center justify-between gap-2 px-3.5 text-left',
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value ? describeRule(value.rule, describeFrom, value.mode) : 'None'}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <RepeatDialog
          value={value}
          startsOn={startsOn}
          scheduleOnly={scheduleOnly}
          onClose={() => setOpen(false)}
          onSave={(repeat) => {
            onChange(repeat)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

/** Choosing how a Task repeats, confirmed by Save (patterns.md#forms). */
function RepeatDialog({
  value,
  startsOn,
  scheduleOnly,
  onClose,
  onSave,
}: {
  value: Repeat | null
  startsOn: string
  scheduleOnly: boolean
  onClose: () => void
  onSave: (repeat: Repeat | null) => void
}) {
  const ids = useId()
  const [s, setS] = useState(() => initial(value, startsOn))
  const set = (patch: Partial<typeof s>) => setS((was) => ({ ...was, ...patch }))

  const date = Number(startsOn.slice(8, 10))
  const weekday = WEEKDAYS[weekdayOf(startsOn)]!
  const longDay = DAY_LETTER[weekday][1]
  const daysInMonth = new Date(
    Number(startsOn.slice(0, 4)),
    Number(startsOn.slice(5, 7)),
    0,
  ).getDate()
  const nth = Math.ceil(date / 7)
  const monthlyOptions: { value: MonthlyOn; label: string }[] = [
    { value: 'date', label: `Day ${date}` },
    ...(nth <= 4 ? [{ value: 'nth' as const, label: `The ${NTH[nth - 1]} ${longDay}` }] : []),
    ...(date + 7 > daysInMonth
      ? [{ value: 'last-weekday' as const, label: `The last ${longDay}` }]
      : []),
    ...(date === daysInMonth ? [{ value: 'last-day' as const, label: 'The last day' }] : []),
  ]
  const monthlyOn = monthlyOptions.some((o) => o.value === s.monthlyOn) ? s.monthlyOn : 'date'

  const every = Number(s.every)
  const count = Number(s.count)
  const schedule = s.mode === 'schedule'
  const valid =
    Number.isInteger(every) &&
    every >= 1 &&
    every <= 999 &&
    (!schedule || s.frequency !== 'weekly' || s.days.length > 0) &&
    (!schedule || s.ends !== 'on' || (s.until !== null && s.until >= startsOn)) &&
    (!schedule || s.ends !== 'after' || (Number.isInteger(count) && count >= 1 && count <= 999))

  const save = () => {
    const rule: Rule = { frequency: s.frequency, interval: every, byDay: [] }
    if (schedule) {
      if (s.frequency === 'weekly') rule.byDay = s.days.map((day) => ({ day }))
      if (s.frequency === 'monthly') {
        if (monthlyOn === 'nth') rule.byDay = [{ day: weekday, nth }]
        else if (monthlyOn === 'last-weekday') rule.byDay = [{ day: weekday, nth: -1 }]
        else rule.byMonthDay = monthlyOn === 'last-day' ? -1 : date
      }
      if (s.ends === 'on' && s.until) rule.until = s.until
      if (s.ends === 'after') rule.count = count
    }
    onSave({ mode: s.mode, rule: formatRule(rule) })
  }

  const units = UNITS.map((u) => ({ value: u.value, label: every === 1 ? u.one : u.many }))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repeat</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) save()
          }}
        >
          {!scheduleOnly && (
            <RadioGroup
              aria-label="Repeats"
              value={s.mode}
              onValueChange={(mode) => set({ mode: mode as RepeatMode })}
              className="gap-2.5 sm:grid-cols-2"
            >
              <RadioCard value="schedule" title="On a schedule" description="On set days" />
              <RadioCard
                value="after_completion"
                title="After it's done"
                description="A while after you tick it"
              />
            </RadioGroup>
          )}

          <Row label={schedule ? 'Every' : 'Comes back after'} htmlFor={`${ids}-every`}>
            <div className="grid grid-cols-3 gap-2.5">
              <Input
                id={`${ids}-every`}
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={s.every}
                onChange={(e) => set({ every: e.target.value })}
              />
              <Select
                value={s.frequency}
                items={units}
                onValueChange={(frequency) => set({ frequency: frequency as Frequency })}
              >
                <SelectTrigger aria-label="Unit" className="col-span-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Row>

          {schedule && s.frequency === 'weekly' && (
            <Row label="On">
              <ToggleGroup
                aria-label="On"
                multiple
                value={s.days}
                onValueChange={(days: string[]) => set({ days: days as Weekday[] })}
              >
                {WEEKDAYS.map((d) => (
                  <ToggleGroupItem key={d} value={d} aria-label={DAY_LETTER[d][1]}>
                    {DAY_LETTER[d][0]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
          )}

          {schedule && s.frequency === 'monthly' && (
            <Row label="On" htmlFor={`${ids}-on`}>
              <Select
                value={monthlyOn}
                items={monthlyOptions}
                onValueChange={(on) => set({ monthlyOn: on as MonthlyOn })}
              >
                <SelectTrigger id={`${ids}-on`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthlyOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          )}

          {schedule && (
            <Row label="Ends" htmlFor={`${ids}-ends`}>
              <div className="grid grid-cols-2 gap-2.5">
                <Select
                  value={s.ends}
                  items={ENDS}
                  onValueChange={(ends) => set({ ends: ends as Ends })}
                >
                  <SelectTrigger
                    id={`${ids}-ends`}
                    className={cn(s.ends === 'never' && 'col-span-2')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENDS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {s.ends === 'on' && (
                  <DateField value={s.until} onChange={(until) => set({ until })} />
                )}
                {s.ends === 'after' && (
                  <Input
                    aria-label="Times"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={s.count}
                    onChange={(e) => set({ count: e.target.value })}
                  />
                )}
              </div>
            </Row>
          )}

          <DialogFooter className="pt-1">
            {value && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => onSave(null)}
              >
                Don't repeat
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const ENDS: { value: Ends; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'on', label: 'On a date' },
  { value: 'after', label: 'After a number of times' },
]
