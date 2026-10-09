import type { ReactNode } from 'react'

/**
 * One per page: an optional kicker (the Module colour on a Module page,
 * muted on a core page), the title, and actions on the right.
 */
export function PageHeader({
  kicker,
  title,
  actions,
}: {
  kicker?: ReactNode
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex items-end gap-3 px-3.5 pt-6 pb-4 sm:px-9 sm:pt-[30px] sm:pb-[18px]">
      <div className="min-w-0 flex-1">
        {kicker && (
          <div className="mb-1.5 flex items-center gap-2 text-kicker text-[var(--mc,var(--muted-foreground))] uppercase">
            {kicker}
          </div>
        )}
        <h1 className="truncate text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1">
          {title}
        </h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
