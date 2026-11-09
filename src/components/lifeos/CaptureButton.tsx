import {
  BellPlusIcon,
  CirclePlusIcon,
  MessageCirclePlusIcon,
  PlusIcon,
  SquarePenIcon,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * How "New" looks. `ghost` is the agreed one; the rest are Stage 7b's
 * draft variations on it, not yet agreed — the same quiet ghost button and
 * word with another icon (`plus`, `circle`, `pen`, `bell`), or `soft`, on
 * the secondary fill as a pill.
 */
export type CaptureLook = 'ghost' | 'plus' | 'circle' | 'pen' | 'bell' | 'soft'

const ICONS: Record<CaptureLook, LucideIcon> = {
  ghost: MessageCirclePlusIcon,
  plus: PlusIcon,
  circle: CirclePlusIcon,
  pen: SquarePenIcon,
  bell: BellPlusIcon,
  soft: PlusIcon,
}

/**
 * Capture's button (components.md): a speech bubble with a plus and "New",
 * ghost, at the top right of every page — in a computer's PageHeader, with
 * N in its Tooltip, and in a phone's top bar.
 */
export function CaptureButton({
  onClick,
  look = 'ghost',
  className,
}: {
  onClick: () => void
  look?: CaptureLook
  className?: string
}) {
  const Icon = ICONS[look]
  const button =
    look === 'soft' ? (
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className={cn('h-9 gap-1.5 rounded-full px-3.5', className)}
      />
    ) : (
      <Button
        variant="ghost"
        onClick={onClick}
        className={cn(
          'gap-2 px-3',
          look === 'ghost' || look === 'circle'
            ? '[&_svg:not([class*=size-])]:size-5'
            : '[&_svg:not([class*=size-])]:size-[18px]',
          className,
        )}
      />
    )
  return (
    <Tooltip>
      <TooltipTrigger render={button}>
        <Icon aria-hidden />
        New
      </TooltipTrigger>
      <TooltipContent>
        {look === 'ghost' ? 'Capture' : 'New'} <Kbd>N</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
