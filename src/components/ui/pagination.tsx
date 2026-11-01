import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

/** Long tables only: ghost buttons, the current page on --accent. */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="Pages"
      data-slot="pagination"
      className={cn('flex justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem(props: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = React.ComponentProps<'a'> & { isActive?: boolean }

/**
 * A page: a link with an `href`; without one, a button, so it can be
 * reached and pressed from the keyboard.
 */
function PaginationLink({ className, isActive, href, ...props }: PaginationLinkProps) {
  const shared = {
    'aria-current': isActive ? ('page' as const) : undefined,
    'data-slot': 'pagination-link',
    className: cn(
      buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
      'tabular-nums aria-[current=page]:bg-accent',
      className,
    ),
  }
  if (href !== undefined) return <a href={href} {...shared} {...props} />
  return (
    <button type="button" {...shared} {...(props as unknown as React.ComponentProps<'button'>)} />
  )
}

function PaginationPrevious(props: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="Previous page" {...props}>
      <ChevronLeftIcon />
    </PaginationLink>
  )
}

function PaginationNext(props: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="Next page" {...props}>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
