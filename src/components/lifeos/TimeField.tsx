import { useCallback, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Every quarter of an hour, "00:00" to "23:45". */
const QUARTERS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0')
  return `${h}:${String((i % 4) * 15).padStart(2, '0')}`
})

/** The times offered: the quarters, and the one it has if that isn't one. */
function timeOptions(value: string): string[] {
  if (!value || QUARTERS.includes(value)) return QUARTERS
  return [...QUARTERS, value].sort()
}

/** Where the list opens: at its time, or 09:00 with none. */
const opensAt = (value: string) => value || '09:00'

/**
 * A time (components.md): a Select of the day's quarter hours, 24-hour,
 * opening at its time; with `none`, "None" first and empty for no time.
 */
export function TimeField({
  value: given,
  defaultValue = '',
  onChange,
  none = false,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: {
  /** "HH:MM", or "" for none. */
  value?: string
  /** Without `value`: where it starts (the design pages). */
  defaultValue?: string
  onChange?: (time: string) => void
  /** Offers "None", for a time that may be left out. */
  none?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}) {
  const [own, setOwn] = useState(defaultValue)
  const value = given ?? own
  const times = timeOptions(value)
  const items = [
    ...(none ? [{ value: '', label: 'None' }] : []),
    ...times.map((t) => ({ value: t, label: t })),
  ]
  // The list is long: it opens scrolled to its time.
  const popup = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const centre = () => {
        const item = el.querySelector<HTMLElement>(`[data-time="${opensAt(value)}"]`)
        if (!item) return
        const top = item.getBoundingClientRect().top - el.getBoundingClientRect().top
        el.scrollTop += top - el.clientHeight / 2 + item.offsetHeight / 2
      }
      // Again once the Select has brought its chosen item into view itself.
      requestAnimationFrame(centre)
      setTimeout(centre, 60)
    },
    [value],
  )
  return (
    <Select
      value={value}
      items={items}
      onValueChange={(t) => {
        const time = (t as string | null) ?? ''
        setOwn(time)
        onChange?.(time)
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        data-slot="time-field"
        className={cn('tabular-nums', className)}
      >
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent ref={popup} className="max-h-72">
        {items.map((t) => (
          <SelectItem
            key={t.value || 'none'}
            value={t.value}
            data-time={t.value || undefined}
            className="tabular-nums"
          >
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
