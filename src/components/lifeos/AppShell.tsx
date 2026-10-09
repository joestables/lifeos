import { Link } from '@tanstack/react-router'
import { EllipsisIcon, LogOutIcon, MenuIcon, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { ModuleKey } from './modules'
import { SyncStatus } from './SyncStatus'

export interface DrawerPage {
  to: string
  label: string
  module: ModuleKey
  icon: LucideIcon
  /** Not built yet: shown at half opacity under "Later". */
  later?: boolean
  count?: number
}

interface ShellProps {
  pages: DrawerPage[]
  me: { name: string; space: string }
  sync: { pending: number; failed: number }
  onSignOut: () => void
  children: ReactNode
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

function Brand() {
  return (
    <div className="flex items-center gap-2.5 text-[16px] font-[750] tracking-[-0.02em] text-foreground">
      <span className="grid size-6 place-items-center rounded-sm bg-ink text-xs font-extrabold text-ink-foreground">
        L
      </span>
      LifeOS
    </div>
  )
}

const pageClasses =
  'flex h-[38px] items-center gap-3 rounded-control px-2.5 font-[550] text-sidebar-foreground outline-none [&>svg]:text-mc'

function Drawer({
  pages,
  me,
  sync,
  onSignOut,
  onNavigate,
}: Omit<ShellProps, 'children'> & { onNavigate?: () => void }) {
  const now = pages.filter((p) => !p.later)
  const later = pages.filter((p) => p.later)
  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5">
      <div className="flex items-center justify-between pr-0.5 pl-1.5">
        <Brand />
      </div>
      <nav aria-label="Pages" className="flex flex-col gap-0.5">
        {now.map((page) => (
          <Link
            key={page.to}
            to={page.to}
            data-module={page.module}
            onClick={onNavigate}
            className={cn(
              pageClasses,
              'hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring-soft aria-[current=page]:bg-selected aria-[current=page]:font-[650] aria-[current=page]:text-foreground',
            )}
          >
            <page.icon />
            {page.label}
            {page.count !== undefined && (
              <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">
                {page.count}
              </span>
            )}
          </Link>
        ))}
        {later.length > 0 && (
          <>
            <div className="px-2.5 pt-2 pb-0.5 text-xs font-semibold text-muted-foreground">
              Later
            </div>
            {later.map((page) => (
              <span
                key={page.to}
                data-module={page.module}
                aria-disabled
                className={cn(pageClasses, 'opacity-50')}
              >
                <page.icon />
                {page.label}
              </span>
            ))}
          </>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5">
        <SyncStatus pending={sync.pending} failed={sync.failed} />
        <div className="flex items-center gap-2.5 rounded-control p-2">
          <Avatar>
            <AvatarFallback>{initials(me.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-[650] text-foreground">{me.name}</div>
            <div className="text-xs text-muted-foreground">{me.space}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Account" />}
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end">
              <DropdownMenuItem onClick={onSignOut}>
                <LogOutIcon /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

/**
 * Every page sits in one: the drawer and the page area. On a phone the
 * drawer becomes a left Sheet, opened from the menu button.
 */
export function AppShell({ children, ...drawer }: ShellProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex h-svh bg-background md:grid md:grid-cols-[252px_minmax(0,1fr)]">
      <aside
        aria-label="Navigation"
        className="m-3 mr-0 hidden min-h-0 flex-col rounded-panel bg-sidebar px-3 py-4 text-sidebar-foreground shadow-card md:flex"
      >
        <Drawer {...drawer} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-1.5 px-3 pt-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Menu" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="bg-sidebar px-3 py-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Drawer {...drawer} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Brand />
        </div>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
