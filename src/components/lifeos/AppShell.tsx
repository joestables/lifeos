import { Link } from '@tanstack/react-router'
import { PlusIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import type { TypeColour } from './colours'
import { BrandMark } from './BrandMark'
import { SyncStatus } from './SyncStatus'

export interface DrawerPage {
  to: string
  label: string
  /** The colour of the Types the page is about; 'none' for Inbox and Plan. */
  colour: TypeColour
  icon: LucideIcon
  /** Not built yet: shown at half opacity under "Later". */
  later?: boolean
  count?: number
}

interface ShellProps {
  pages: DrawerPage[]
  me: { name: string; space: string }
  sync: { pending: number; failed: number }
  /** Shown at the top of every page: the offline notice (OFF-005). */
  notice?: ReactNode
  /** Opens capture (CAP-002): the drawer's button on a computer, the top bar's on a phone. */
  onCapture?: () => void
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
      <BrandMark />
      LifeOS
    </div>
  )
}

function Drawer({ pages, me, sync, onCapture }: Omit<ShellProps, 'children' | 'notice'>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const now = pages.filter((p) => !p.later)
  const later = pages.filter((p) => p.later)
  const close = () => isMobile && setOpenMobile(false)
  return (
    <>
      <SidebarHeader>
        <div className="flex h-8 items-center pl-1.5">
          <Brand />
        </div>
        {onCapture && !isMobile && (
          <Button className="mt-2 w-full" onClick={onCapture}>
            <PlusIcon /> Capture <Kbd className="ml-auto">N</Kbd>
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Pages">
          <SidebarMenu>
            {now.map((page) => (
              <SidebarMenuItem key={page.to} data-colour={page.colour}>
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
                  <SidebarMenuItem key={page.to} data-colour={page.colour}>
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
        <Link
          to="/settings"
          onClick={close}
          aria-label={`${me.name}, Settings`}
          className="flex items-center gap-2.5 rounded-control p-2 outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring-soft aria-[current=page]:bg-sidebar-accent"
        >
          <Avatar>
            <AvatarFallback>{initials(me.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-[650] text-foreground">{me.name}</div>
            <div className="text-xs text-muted-foreground">{me.space}</div>
          </div>
        </Link>
      </SidebarFooter>
    </>
  )
}

/**
 * Every page sits in one: the drawer (shadcn's Sidebar) and the page area,
 * which scrolls in a ScrollArea. On a phone, a top bar that stays at the top
 * (the menu button, the brand, Capture), and the drawer is a left Sheet.
 */
export function AppShell({ children, onCapture, notice, ...drawer }: ShellProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <Drawer {...drawer} onCapture={onCapture} />
      </Sidebar>
      <SidebarInset>
        <div className="box-content flex h-16 shrink-0 items-center gap-2 bg-background px-2 pt-[env(safe-area-inset-top)] md:hidden">
          <SidebarTrigger />
          <Brand />
          {onCapture && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Capture"
              className="ml-auto size-12 [&_svg]:size-5.5"
              onClick={onCapture}
            >
              <PlusIcon />
            </Button>
          )}
        </div>
        <ScrollArea
          className="flex-1"
          viewportClassName="pb-[env(safe-area-inset-bottom)]"
          restorationId="page"
        >
          {notice && <div className="px-5 pt-3 sm:px-9 sm:pt-6">{notice}</div>}
          {children}
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
