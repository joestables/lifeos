import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { ChevronRightIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * A row inside a Card (Settings): an optional icon, a label, an optional
 * muted value, then a control. 44px; given `render` (a link), it is a 48px
 * row you choose, with a chevron when it leads to another page; red when
 * it deletes.
 */
export function CardRow({
  icon,
  label,
  value,
  children,
  render,
  chevron = true,
  destructive = false,
  className,
  ...props
}: Omit<useRender.ComponentProps<'div'>, 'children'> & {
  icon?: React.ReactNode
  label: React.ReactNode
  value?: React.ReactNode
  children?: React.ReactNode
  /** False for a row that acts here rather than leading somewhere (Sign out). */
  chevron?: boolean
  /** Red, for a row that deletes (Delete household). */
  destructive?: boolean
}) {
  const link = render !== undefined
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex items-center gap-3 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
          link
            ? 'h-12 rounded-control px-3 text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring-soft'
            : 'h-11',
          destructive && 'text-destructive [&>svg]:text-destructive',
          className,
        ),
        children: (
          <>
            {icon}
            <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
            {value !== undefined && (
              <span className="text-sm text-muted-foreground tabular-nums">{value}</span>
            )}
            {children}
            {link && chevron && <ChevronRightIcon aria-hidden />}
          </>
        ),
      },
      props,
    ),
  })
}
