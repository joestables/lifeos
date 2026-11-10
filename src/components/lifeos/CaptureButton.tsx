import { BellPlusIcon, MessageCirclePlusIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * How "New" looks: `bell`, from Stage 7b (Joe's choice, 9 November): the
 * quiet button with a bell and a plus; `ghost`, the speech bubble it had
 * before, kept to draw earlier designs.
 */
export type CaptureLook = 'ghost' | 'bell'

const ICONS: Record<CaptureLook, LucideIcon> = {
  ghost: MessageCirclePlusIcon,
  bell: BellPlusIcon,
}

/**
 * "New"'s button (components.md, NEW-001): a bell with a plus and "New",
 * ghost, at the top right of every page — in a computer's PageHeader, with
 * N in its Tooltip, and in a phone's top bar.
 */
export function CaptureButton({
  onClick,
  look = 'bell',
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
        New
      </TooltipTrigger>
      <TooltipContent>
        {look === 'ghost' ? 'Capture' : 'New'} <Kbd>N</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
