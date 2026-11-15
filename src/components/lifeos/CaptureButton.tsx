import { BellPlusIcon, MessageCirclePlusIcon, SquarePenIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * How Capture's button looks: `pen`, a pen on a square and "Capture" (Joe's
 * choice, 15 November: it makes a Thought as often as a Reminder, so no
 * bell); `bell` and `ghost`, the looks it had before, kept to draw earlier
 * designs.
 */
export type CaptureLook = 'ghost' | 'bell' | 'pen'

const ICONS: Record<CaptureLook, LucideIcon> = {
  ghost: MessageCirclePlusIcon,
  bell: BellPlusIcon,
  pen: SquarePenIcon,
}

/**
 * Capture's button (components.md, NEW-001): a pen and "Capture", ghost, at
 * the top right of every page — in a computer's PageHeader, with N in its
 * Tooltip, and in a phone's top bar.
 */
export function CaptureButton({
  onClick,
  look = 'pen',
  className,
}: {
  onClick: () => void
  look?: CaptureLook
  className?: string
}) {
  const Icon = ICONS[look]
  const button = (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'gap-2 px-3',
        look === 'ghost'
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
        Capture
      </TooltipTrigger>
      <TooltipContent>
        Capture <Kbd>N</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
