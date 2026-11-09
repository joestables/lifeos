import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { SearchIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
import { CaptureButton, type CaptureLook } from './CaptureButton'
import { PullToRefresh } from './PullToRefresh'
import { ShellCapture, ShellCaptureLook } from './shell-context'
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
  /** Clears changes the server refused, once seen (OFF-004). */
  onClearRefused?: () => void
  /** Shown at the top of every page: the offline notice (OFF-005). */
  notice?: ReactNode
  /** Opens capture (CAP-002): "New" at the top right, in the PageHeader on a computer, the top bar on a phone. */
  onCapture?: () => void
  /** How "New" looks: 'ghost', or one of Stage 7b's draft directions. */
  captureLook?: CaptureLook
  /** Opens Search (SRC-001): beside the brand in the drawer's header. */
  onSearch?: () => void
  /** Pulled down from the top of a page on a phone. */
  onRefresh?: () => void
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

function Drawer({
  pages,
  me,
  sync,
  onSearch,
  onClearRefused,
}: Omit<ShellProps, 'children' | 'notice' | 'onCapture'>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const now = pages.filter((p) => !p.later)
  const later = pages.filter((p) => p.later)
  const close = () => isMobile && setOpenMobile(false)
  return (
    <>
      <SidebarHeader>
        <div className="flex h-8 items-center justify-between pl-1.5 max-md:h-12">
          <Brand />
          {onSearch &&
            (isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="size-11 text-muted-foreground [&_svg]:size-5"
                onClick={() => {
                  close()
                  onSearch()
                }}
              >
                <SearchIcon />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Search"
                      className="text-muted-foreground"
                      onClick={onSearch}
                    />
                  }
                >
                  <SearchIcon />
                </TooltipTrigger>
                <TooltipContent>
                  Search <Kbd>/</Kbd>
                </TooltipContent>
              </Tooltip>
            ))}
        </div>
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
        <SyncStatus pending={sync.pending} failed={sync.failed} onClear={onClearRefused} />
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
export function AppShell({
  children,
  onCapture,
  captureLook = 'ghost',
  onSearch,
  onRefresh = () => window.location.reload(),
  notice,
  ...drawer
}: ShellProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <Drawer {...drawer} onSearch={onSearch} />
      </Sidebar>
      <SidebarInset>
        <div className="box-content flex h-16 shrink-0 items-center gap-2 bg-background px-2 pt-[env(safe-area-inset-top)] md:hidden">
          <SidebarTrigger />
          <Brand />
          {onCapture && (
            <CaptureButton
              look={captureLook}
              className={cn('ml-auto', 'h-11')}
              onClick={onCapture}
            />
          )}
        </div>
        <ShellCaptureLook.Provider value={captureLook}>
          <ShellCapture.Provider value={onCapture}>
            <PullToRefresh onRefresh={onRefresh}>
              <ScrollArea
                className="flex-1"
                viewportClassName="pb-[env(safe-area-inset-bottom)]"
                restorationId="page"
              >
                {notice && <div className="px-5 pt-3 sm:px-9 sm:pt-6">{notice}</div>}
                {children}
              </ScrollArea>
            </PullToRefresh>
          </ShellCapture.Provider>
        </ShellCaptureLook.Provider>
      </SidebarInset>
    </SidebarProvider>
  )
}
