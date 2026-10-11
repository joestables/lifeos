import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Fab } from './Fab'

/**
 * One per page: the title, and the page's main action ("New task") on the
 * right — a primary button on a computer, a Fab on a phone (components.md).
 */
export function PageHeader({
  title,
  action,
}: {
  title: ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <header className="flex items-center gap-3 px-5 pt-3 pb-5 sm:px-9 sm:pt-[30px] sm:pb-[18px]">
      <h1 className="min-w-0 flex-1 truncate text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1">
        {title}
      </h1>
      {action && (
        <>
          <Button size="sm" className="hidden md:inline-flex" onClick={action.onClick}>
            <PlusIcon /> {action.label}
          </Button>
          <Fab label={action.label} onClick={action.onClick} />
        </>
      )}
    </header>
  )
}
