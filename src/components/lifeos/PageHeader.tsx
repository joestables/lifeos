import { PlusIcon } from 'lucide-react'
import { useContext, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BackLink } from './BackLink'
import { CaptureButton } from './CaptureButton'
import { Fab } from './Fab'
import { ShellCapture } from './shell-context'

/**
 * One per page: the title and, on a computer, capture's "New" on the right.
 * The page's main action ("New task") is a Fab on a phone; on a computer
 * it is a PageAction beside the page's Tabs (components.md).
 */
export function PageHeader({
  title,
  action,
  back,
}: {
  title: ReactNode
  /** The page's main action: its Fab on a phone. */
  action?: { label: string; onClick: () => void }
  /** A page reached from another (Recently deleted, from Settings): back to it. */
  back?: { label: string; onClick: () => void }
}) {
  const capture = useContext(ShellCapture)
  return (
    <header className="flex items-end gap-3 px-5 pt-3 pb-5 sm:px-9 sm:pt-[30px] sm:pb-[18px]">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {back && <BackLink label={back.label} onClick={back.onClick} />}
        <h1 className="truncate text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1">
          {title}
        </h1>
      </div>
      {capture && <CaptureButton className="hidden md:inline-flex" onClick={capture} />}
      {action && <Fab label={action.label} onClick={action.onClick} />}
    </header>
  )
}

/**
 * A page's main action on a computer ("New task"): a small primary button
 * just after the page's Tabs, a little further from them than they are from
 * each other. Hidden on a phone, where the Fab has it.
 */
export function PageAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" className="hidden md:inline-flex" onClick={onClick}>
      <PlusIcon /> {label}
    </Button>
  )
}

/** A page's Tabs and, after them, its PageAction. */
export function TabsRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 items-center gap-4', className)}>{children}</div>
}
