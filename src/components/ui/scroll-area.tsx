import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * ScrollArea (components.md): every scrolling box — the page, the drawer, a
 * Dialog's body. No browser scrollbar; a 6px thumb, 2px from the edge,
 * always shown with a mouse while there is more to scroll (Joe, 23
 * October), and on a touch screen while scrolling. With `fade`, its foot
 * fades into the popup while more lies below, so a touch screen, which
 * shows no thumb at rest, still says there is more (Joe, 15 November).
 */
function ScrollArea({
  className,
  children,
  orientation = 'vertical',
  viewportClassName,
  restorationId,
  fade = false,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  orientation?: 'vertical' | 'horizontal' | 'both'
  viewportClassName?: string
  /** The router puts this box back where it was on going back (ITM-001). */
  restorationId?: string
  /** A Dialog's body: fades at its foot while there is more to scroll to. */
  fade?: boolean
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  useEffect(() => {
    const el = viewport.current
    if (!fade || !el) return
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    check()
    el.addEventListener('scroll', check, { passive: true })
    const watch = new ResizeObserver(check)
    watch.observe(el)
    if (el.firstElementChild) watch.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', check)
      watch.disconnect()
    }
  }, [fade])
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative flex min-h-0 flex-col overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewport}
        data-slot="scroll-area-viewport"
        data-scroll-restoration-id={restorationId}
        className={cn(
          // A flex child, not 100% high: a box sized by its parent's flex
          // (a Dialog's body) has no height for a percentage to take.
          'min-h-0 w-full flex-1 overscroll-contain rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring-soft',
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {fade && (
        <div
          aria-hidden
          data-slot="scroll-area-fade"
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-popover to-transparent transition-opacity',
            more ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
      {orientation !== 'horizontal' && <ScrollBar orientation="vertical" />}
      {orientation !== 'vertical' && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'z-10 flex touch-none p-0.5 opacity-0 transition-opacity select-none pointer-fine:opacity-100 data-hovering:opacity-100 data-scrolling:opacity-100 data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:w-2.5',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-scroll-thumb"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
