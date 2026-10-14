import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Plan's toolbar (patterns.md#plan): Today and the arrows, the dates shown,
 * and on a computer Week or Day, then the page's main action.
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
  /** "12 – 18 October 2026", "Thursday 15 October" */
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
    <div className="flex min-w-0 items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Previous ${step}`}
                onClick={onPrevious}
              />
            }
          >
            <ChevronLeftIcon />
          </TooltipTrigger>
          <TooltipContent>Previous {step}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`Next ${step}`} onClick={onNext} />
            }
          >
            <ChevronRightIcon />
          </TooltipTrigger>
          <TooltipContent>Next {step}</TooltipContent>
        </Tooltip>
      </div>
      <h2 className="min-w-0 flex-1 truncate text-h2 tabular-nums">{title}</h2>
      <ToggleGroup
        aria-label="Layout"
        className="hidden md:inline-flex"
        value={[layout]}
        onValueChange={(v) => v[0] && onLayout(v[0] as 'week' | 'day')}
      >
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
      </ToggleGroup>
      {action}
    </div>
  )
}
