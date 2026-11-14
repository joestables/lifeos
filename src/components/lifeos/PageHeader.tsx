import { PlusIcon } from 'lucide-react'
import type * as React from 'react'
import { useContext, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useBack } from '@/hooks/use-back'
import { cn } from '@/lib/utils'
import { BackLink } from './BackLink'
import { CaptureButton } from './CaptureButton'
import { Fab } from './Fab'
import { ShellCapture, ShellCaptureLook } from './shell-context'

/**
 * One per page: the title and, on a computer, capture's "New" on the right.
 * The page's main action ("New task") is a Fab on a phone; on a computer
 * it is a PageAction beside the page's Tabs (components.md).
 */
export function PageHeader({
  title,
  action,
  back,
  eyebrow,
  trailing,
}: {
  title: ReactNode
  /** The page's main action: its Fab on a phone. */
  action?: { label: string; onClick: () => void }
  /**
   * A page reached from another (Recently deleted, from Settings): back to
   * it. Where the browser's Back would go elsewhere, the link goes there
   * instead, named for that page (useBack).
   */
  back?: { label: string; onClick: () => void }
  /** A line over the title in the Type's text colour ("Cooking · Air fryer"). */
  eyebrow?: ReactNode
  /** Controls at the title's end (Cooking's servings and Finish). */
  trailing?: ReactNode
}) {
  const backTo = useBack(back)
  const capture = useContext(ShellCapture)
  const look = useContext(ShellCaptureLook)
  return (
    <header className="flex items-end gap-3 px-5 pt-3 pb-5 sm:px-9 sm:pt-[30px] sm:pb-[18px]">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {backTo && <BackLink label={backTo.label} onClick={backTo.onClick} />}
        {eyebrow && <span className="pt-1 text-sm font-semibold text-tc-text">{eyebrow}</span>}
        <h1
          data-slot="page-title"
          className="truncate text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1"
        >
          {title}
        </h1>
      </div>
      {trailing}
      {capture && !trailing && (
        <CaptureButton look={look} className="hidden md:inline-flex" onClick={capture} />
      )}
      {action && <Fab label={action.label} onClick={action.onClick} />}
    </header>
  )
}

/**
 * A page's main action on a computer ("New task"): a small primary button
 * just after the page's Tabs, a little further from them than they are from
 * each other. Hidden on a phone, where the Fab has it.
 */
export function PageAction({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & { label: string }) {
  return (
    <Button size="sm" className={cn('hidden md:inline-flex', className)} {...props}>
      <PlusIcon /> {label}
    </Button>
  )
}

/** A page's Tabs and, after them, its PageAction. */
export function TabsRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 items-center gap-4', className)}>{children}</div>
}
