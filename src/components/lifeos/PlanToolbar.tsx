import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'
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
 * Plan's toolbar (patterns.md#plan): the dates shown on the left; on the
 * right the previous arrow, Today, the next arrow, then on a computer Week
 * or Day and the page's main action.
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
}: {
  /** "12 – 18 October", "Thursday 15 October" */
  title: string
  layout: 'week' | 'day'
  onLayout: (layout: 'week' | 'day') => void
  onToday: () => void
  onPrevious: () => void
  onNext: () => void
  /** What the arrows move by, for their names: "week" or "day". */
  step: string
  /** The PageAction, "Add". */
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="min-w-0 flex-1 truncate text-h2 tabular-nums">{title}</h2>
      <div className="flex items-center gap-1">
        <Arrow label={`Previous ${step}`} onClick={onPrevious} />
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
        <Arrow label={`Next ${step}`} onClick={onNext} next />
      </div>
      <ToggleGroup
        aria-label="Layout"
        className="hidden md:inline-flex"
        value={[layout]}
        onValueChange={(v) => v[0] && onLayout(v[0] as 'week' | 'day')}
      >
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
      </ToggleGroup>
      {action}
    </div>
  )
}
