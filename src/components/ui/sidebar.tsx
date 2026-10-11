import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { MenuIcon } from 'lucide-react'
import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { ScrollArea } from './scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet'

/**
 * shadcn's Sidebar in its standard form, as the drawer (components.md): full
 * height and attached to the left edge on desktop, a left Sheet on a phone.
 * LifeOS's drawer can't be hidden on desktop, so shadcn's collapsing (rail,
 * icon mode, cookie, ⌘B) is left out.
 */
type SidebarContextProps = {
  isMobile: boolean
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.')
  return context
}

function SidebarProvider({ className, children, ...props }: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const toggleSidebar = React.useCallback(() => setOpenMobile((open) => !open), [])

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({ isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [isMobile, openMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        className={cn(
          'group/sidebar-wrapper flex h-svh w-full overflow-hidden bg-background [--sidebar-width:256px]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          showCloseButton={false}
          keepMounted
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="gap-0 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">The pages of LifeOS</SheetDescription>
          <div
            className={cn(
              'flex size-full min-h-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
              className,
            )}
            {...props}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div data-slot="sidebar" className="hidden text-sidebar-foreground md:block">
      <div data-slot="sidebar-gap" className="w-(--sidebar-width)" />
      <div
        data-slot="sidebar-container"
        className="fixed inset-y-0 left-0 z-10 flex h-svh w-(--sidebar-width) bg-sidebar shadow-[inset_-1px_0_0_var(--hairline)]"
      >
        <aside
          aria-label="Navigation"
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className={cn('flex size-full min-h-0 flex-col', className)}
          {...props}
        >
          {children}
        </aside>
      </div>
    </div>
  )
}

/** The menu button in a phone's top bar: 48px, with a 22px icon. */
function SidebarTrigger({ onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-label="Menu"
      className="size-12"
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <MenuIcon className="size-5.5" />
    </Button>
  )
}

/** The page area beside the drawer, as tall as the screen; the page scrolls inside it. */
function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn('relative flex h-svh w-full min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-3 px-3 pt-4 pb-2', className)}
      {...props}
    />
  )
}

/** The pages, in a ScrollArea when they don't fit. */
function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <ScrollArea className="flex-1">
      <div
        data-slot="sidebar-content"
        data-sidebar="content"
        className={cn('flex flex-col gap-2 px-3 py-2', className)}
        {...props}
      />
    </ScrollArea>
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-1.5 px-3 pt-2 pb-3.5', className)}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'> & React.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn('px-2.5 pt-2 pb-0.5 text-xs font-semibold text-muted-foreground', className),
      },
      props,
    ),
    render,
    state: { slot: 'sidebar-group-label', sidebar: 'group-label' },
  })
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full', className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  )
}

/**
 * A page in the drawer: 38px, 44px on a phone; the icon in its Type colour;
 * the current page (`isActive`, or a router link's `aria-current="page"`)
 * filled with `--sidebar-accent` (patterns.md#the-drawer).
 */
function SidebarMenuButton({
  render,
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<'button'> & React.ComponentProps<'button'> & { isActive?: boolean }) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          'flex h-[38px] w-full items-center gap-3 rounded-control px-2.5 text-left font-[550] text-sidebar-foreground outline-none select-none in-data-[mobile=true]:h-11 hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring-soft aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-[650] aria-[current=page]:text-foreground data-active:bg-sidebar-accent data-active:font-[650] data-active:text-foreground [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-tc-text',
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: 'sidebar-menu-button', sidebar: 'menu-button', active: isActive },
  })
}

/** A count on the right of a page: 12px, muted, tabular. */
function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn('ml-auto text-xs font-semibold text-muted-foreground tabular-nums', className)}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
}
