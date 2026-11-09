import { BellRingIcon, LightbulbIcon, MessageCirclePlusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * How "New" looks. `ghost` is the agreed one; the rest are Stage 7b's
 * draft directions, not yet agreed: `primary` (an ink "+ New"), `icon` (a
 * round "+"), `split` (Reminder, with a Thought beside it) and `field` (a
 * box that reads "Remind me to…", as if typing had already begun).
 */
export type CaptureLook = 'ghost' | 'primary' | 'icon' | 'split' | 'field'

/**
 * Capture's button (components.md): a speech bubble with a plus and "New",
 * ghost, at the top right of every page — in a computer's PageHeader, with
 * N in its Tooltip, and in a phone's top bar.
 */
export function CaptureButton({
  onClick,
  onThought,
  look = 'ghost',
  className,
}: {
  onClick: () => void
  /** `split` only: the Thought beside the Reminder. */
  onThought?: () => void
  look?: CaptureLook
  className?: string
}) {
  const tip = (
    <TooltipContent>
      New <Kbd>N</Kbd>
    </TooltipContent>
  )
  if (look === 'field')
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-10 min-w-0 items-center gap-2.5 rounded-full bg-input px-4 text-left text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft md:w-72 [&_svg]:size-4 [&_svg]:shrink-0',
          className,
        )}
      >
        <BellRingIcon data-colour="blue" className="text-tc-text" aria-hidden />
        <span className="flex-1 truncate">Remind me to…</span>
        <Kbd className="hidden md:inline-flex">N</Kbd>
      </button>
    )
  if (look === 'split')
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button variant="outline" size="sm" onClick={onClick} className="h-9 rounded-full px-3.5">
          <BellRingIcon data-colour="blue" className="text-tc-text" aria-hidden />
          Reminder
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="New thought"
                onClick={onThought ?? onClick}
                className="size-9 rounded-full"
              />
            }
          >
            <LightbulbIcon data-colour="yellow" className="text-tc-text" aria-hidden />
          </TooltipTrigger>
          <TooltipContent>Thought</TooltipContent>
        </Tooltip>
      </div>
    )
  if (look === 'icon')
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="primary"
              size="icon"
              aria-label="New"
              onClick={onClick}
              className={cn('rounded-full', className)}
            />
          }
        >
          <PlusIcon />
        </TooltipTrigger>
        {tip}
      </Tooltip>
    )
  if (look === 'primary')
    return (
      <Tooltip>
        <TooltipTrigger
          render={<Button onClick={onClick} className={cn('h-9 rounded-full px-4', className)} />}
        >
          <PlusIcon aria-hidden />
          New
        </TooltipTrigger>
        {tip}
      </Tooltip>
    )
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
