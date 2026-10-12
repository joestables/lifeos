import { MessageCirclePlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Capture's button (components.md): a speech bubble with a plus and "New",
 * ghost, at the top right of every page — in a computer's PageHeader, with
 * N in its Tooltip, and in a phone's top bar.
 */
export function CaptureButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const button = (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn('gap-2 px-3 [&_svg:not([class*=size-])]:size-5', className)}
    />
  )
  return (
    <Tooltip>
      <TooltipTrigger render={button}>
        <MessageCirclePlusIcon aria-hidden />
        New
      </TooltipTrigger>
      <TooltipContent>
        Capture <Kbd>N</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
