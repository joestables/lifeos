import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Tabular data: workout sets, Recently deleted. */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom border-collapse', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader(props: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" {...props} />
}

function TableBody(props: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={className} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'px-2 pb-2 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'border-t border-[color-mix(in_oklch,var(--foreground)_6%,transparent)] px-2 py-1.5 align-middle tabular-nums',
        className,
      )}
      {...props}
    />
  )
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
