import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fromIsoDay, isoDayOf } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function Arrow({ label, onClick, next }: { label: string; onClick: () => void; next?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {next ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Plan's toolbar (patterns.md#plan): the dates shown on the left, which open
 * a Calendar to go to any date (PLN-003 3); on the right the previous arrow,
 * Today, the next arrow, then on a computer Week or Day and the page's main
 * action.
 */
export function PlanToolbar({
  title,
  layout,
  onLayout,
  onToday,
  onPrevious,
  onNext,
  step,
  action,
  day,
  onChooseDay,
}: {
  /** "12 – 18 October", "Thursday 15 October" */
  title: string
  /** The day shown, or chosen in the week, for the Calendar. */
  day?: string
  onChooseDay?: (day: string) => void
  layout: 'week' | 'day'
  /** Without it there is no Day / Week switch (the Meal plan is always a week). */
  onLayout?: (layout: 'week' | 'day') => void
  onToday: () => void
  onPrevious: () => void
  onNext: () => void
  /** What the arrows move by, for their names: "week" or "day". */
  step: string
  /** The PageAction, "Add". */
  action?: ReactNode
}) {
  const [choosing, setChoosing] = useState(false)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="flex min-w-0 flex-1 text-h2 tabular-nums">
        {onChooseDay ? (
          <Popover open={choosing} onOpenChange={setChoosing}>
            <PopoverTrigger className="-mx-1.5 flex min-w-0 items-center gap-1.5 rounded-row px-1.5 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft data-popup-open:bg-accent">
              <span className="truncate">{title}</span>
              <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <Calendar
                mode="single"
                selected={day ? fromIsoDay(day) : undefined}
                defaultMonth={day ? fromIsoDay(day) : undefined}
                onSelect={(d) => {
                  if (d) onChooseDay(isoDayOf(d))
                  setChoosing(false)
                }}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <span className="truncate">{title}</span>
        )}
      </h2>
      <div className="flex items-center gap-1">
        <Arrow label={`Previous ${step}`} onClick={onPrevious} />
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
        <Arrow label={`Next ${step}`} onClick={onNext} next />
      </div>
      {onLayout && (
        <ToggleGroup
          aria-label="Layout"
          className="hidden md:inline-flex"
          value={[layout]}
          onValueChange={(v) => v[0] && onLayout(v[0] as 'week' | 'day')}
        >
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
        </ToggleGroup>
      )}
      {action}
    </div>
  )
}
