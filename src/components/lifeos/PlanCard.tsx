import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/** A small card in a Plan day, in its Type's colour; past Items fade to 50%. */
export function PlanCard({
  colour,
  icon: Icon,
  type,
  title,
  time,
  past = false,
}: {
  colour: TypeColour
  icon: LucideIcon
  type: string
  title: string
  time?: string
  past?: boolean
}) {
  return (
    <div
      data-colour={colour}
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-control bg-card px-2.5 py-[9px] shadow-card',
        past && 'opacity-50 shadow-none',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-tc-text [&_svg]:size-[13px]">
        <Icon />
        {type}
      </div>
      <div className="text-sm leading-[1.3] font-[650]">{title}</div>
      {time && <div className="text-xs text-muted-foreground tabular-nums">{time}</div>}
    </div>
  )
}
