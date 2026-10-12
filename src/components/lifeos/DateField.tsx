import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { fieldClasses } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dateName, fromIsoDay, isoDayOf } from '@/lib/dates'
import { cn } from '@/lib/utils'

/**
 * A date, chosen from a Calendar (components.md): looks like a Select, says
 * the date as people do, "None" when empty, red when `late`.
 */
export function DateField({
  id,
  value,
  onChange,
  late = false,
  open,
  onOpenChange,
}: {
  id?: string
  /** "2026-10-16", or null. */
  value: string | null
  onChange: (day: string | null) => void
  late?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        id={id}
        className={cn(
          fieldClasses,
          'flex h-10 cursor-pointer items-center justify-between gap-2 px-3.5 text-left data-popup-open:bg-card data-popup-open:ring-3 data-popup-open:ring-ring-soft',
        )}
      >
        <span
          className={cn(!value && 'text-muted-foreground', value && late && 'text-destructive')}
        >
          {value ? dateName(value) : 'None'}
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2 p-3">
        <Calendar
          mode="single"
          selected={value ? fromIsoDay(value) : undefined}
          defaultMonth={value ? fromIsoDay(value) : undefined}
          onSelect={(d) => {
            onChange(d ? isoDayOf(d) : null)
            onOpenChange?.(false)
          }}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              onChange(null)
              onOpenChange?.(false)
            }}
          >
            No date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
