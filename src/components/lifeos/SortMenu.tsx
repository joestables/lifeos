import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { fieldClasses } from '@/components/ui/input'
import type { SortDirection } from '@/lib/sort'
import { cn } from '@/lib/utils'

export type { SortDirection }

export interface SortOption<T extends string> {
  value: T
  label: string
  /** Which way it runs when first chosen: newest or most first, A–Z ascending. */
  initial: SortDirection
}

const Arrow = ({ dir }: { dir: SortDirection }) =>
  dir === 'asc' ? <ArrowUpIcon aria-hidden /> : <ArrowDownIcon aria-hidden />

/**
 * Sort as an `sm` field opening a DropdownMenu (components.md): the trigger
 * names the sort with its arrow; in the menu the active one shows its arrow
 * where a Select shows a tick, and choosing it again reverses it, the menu
 * staying open. Another starts its own way. More groups (the Pantry's Show)
 * follow as children.
 */
export function SortMenu<T extends string>({
  options,
  value,
  direction,
  onChange,
  fill,
  children,
}: {
  options: readonly SortOption<T>[]
  value: T
  direction: SortDirection
  onChange: (value: T, direction: SortDirection) => void
  /** Sharing the row's width (a phone). */
  fill?: boolean
  children?: ReactNode
}) {
  const current = options.find((o) => o.value === value) ?? options[0]!
  const dirName = direction === 'asc' ? 'ascending' : 'descending'
  return (
    <DropdownMenu>
      <MenuPrimitive.Trigger
        aria-label={`Sort: ${current.label}, ${dirName}`}
        className={cn(
          fieldClasses,
          'flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left text-sm data-popup-open:bg-card data-popup-open:ring-3 data-popup-open:ring-ring-soft [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
          fill ? 'min-w-0 flex-1 lg:w-auto lg:flex-none' : 'w-auto',
        )}
      >
        <span className="truncate">{current.label}</span>
        <Arrow dir={direction} />
        <ChevronDownIcon className="ml-auto" />
      </MenuPrimitive.Trigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          {options.map((o) => {
            const on = o.value === value
            return (
              <DropdownMenuItem
                key={o.value}
                closeOnClick={!on}
                aria-label={on ? `${o.label}, ${dirName}: reverse` : o.label}
                className={cn('pr-8', on && 'font-semibold')}
                onClick={() =>
                  onChange(o.value, on ? (direction === 'asc' ? 'desc' : 'asc') : o.initial)
                }
              >
                {o.label}
                {on && (
                  <span className="absolute right-2.5 flex [&_svg]:text-foreground">
                    <Arrow dir={direction} />
                  </span>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
