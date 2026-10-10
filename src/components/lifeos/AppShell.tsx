import { Link } from '@tanstack/react-router'
import { EllipsisIcon, LogOutIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
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

function Drawer({ pages, me, sync, onSignOut }: Omit<ShellProps, 'children'>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const now = pages.filter((p) => !p.later)
  const later = pages.filter((p) => p.later)
  const close = () => isMobile && setOpenMobile(false)
  return (
    <>
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Pages">
          <SidebarMenu>
            {now.map((page) => (
              <SidebarMenuItem key={page.to} data-module={page.module}>
                <SidebarMenuButton render={<Link to={page.to} onClick={close} />}>
                  <page.icon />
                  {page.label}
                  {page.count !== undefined && <SidebarMenuBadge>{page.count}</SidebarMenuBadge>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          {later.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Later</SidebarGroupLabel>
              <SidebarMenu>
                {later.map((page) => (
                  <SidebarMenuItem key={page.to} data-module={page.module}>
                    <SidebarMenuButton render={<span />} aria-disabled>
                      <page.icon />
                      {page.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </nav>
      </SidebarContent>
      <SidebarFooter>
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
      </SidebarFooter>
    </>
  )
}

/**
 * Every page sits in one: the drawer (shadcn's Sidebar) and the page area,
 * which scrolls with the window. On a phone, a top bar with the menu button,
 * and the drawer is a left Sheet.
 */
export function AppShell({ children, ...drawer }: ShellProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <Drawer {...drawer} />
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-10 box-content flex h-16 items-center gap-2 bg-background px-2 pt-[env(safe-area-inset-top)] md:hidden">
          <SidebarTrigger />
          <Brand />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
