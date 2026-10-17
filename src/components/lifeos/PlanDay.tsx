import type { ReactNode } from 'react'

/**
 * One day on Plan (PLN-002): its PlanCards (`wide`) in a list, all-day and
 * untimed first, then by time, each card saying its own time.
 */
export function PlanDay({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}
