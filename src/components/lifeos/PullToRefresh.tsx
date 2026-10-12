import { RefreshCwIcon } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** How far to pull before letting go reloads, and the most it moves. */
const PULL = 72
const MAX = 110

/**
 * Pull to refresh on a phone (components.md): the page scrolls in its own
 * box, which the browser's pull to refresh can't reach, so this does it.
 * Pulled down from the top of the page, a round indicator follows the
 * finger, turning; let go past 72px and `onRefresh` runs while it spins.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => void
  children: ReactNode
}) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const box = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const viewport = () =>
        el.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? el
      let start: { x: number; y: number } | null = null
      let distance = 0
      const down = (e: TouchEvent) => {
        const t = e.touches[0]
        start =
          e.touches.length === 1 && t && viewport().scrollTop <= 0
            ? { x: t.clientX, y: t.clientY }
            : null
        distance = 0
      }
      const move = (e: TouchEvent) => {
        const t = e.touches[0]
        if (!start || !t) return
        const dy = t.clientY - start.y
        const dx = t.clientX - start.x
        // Only a pull straight down from the top; a sideways swipe is a row's.
        if (distance === 0 && (dy <= 0 || Math.abs(dx) > dy || viewport().scrollTop > 0)) {
          start = null
          return
        }
        distance = Math.min(MAX, dy * 0.5)
        setPull(distance)
      }
      const up = () => {
        if (start && distance >= PULL) {
          setRefreshing(true)
          setPull(PULL)
          onRefresh()
        } else setPull(0)
        start = null
        distance = 0
      }
      el.addEventListener('touchstart', down, { passive: true })
      el.addEventListener('touchmove', move, { passive: true })
      el.addEventListener('touchend', up)
      el.addEventListener('touchcancel', up)
      return () => {
        el.removeEventListener('touchstart', down)
        el.removeEventListener('touchmove', move)
        el.removeEventListener('touchend', up)
        el.removeEventListener('touchcancel', up)
      }
    },
    [onRefresh],
  )

  return (
    <div ref={box} className="relative flex min-h-0 flex-1 flex-col">
      {(pull > 0 || refreshing) && (
        <div
          role="status"
          aria-label={refreshing ? 'Refreshing' : 'Pull to refresh'}
          className="pointer-events-none absolute top-0 left-1/2 z-30 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-popover text-muted-foreground shadow-pop"
          // Follows the finger: a computed position.
          style={{ transform: `translate(-50%, ${pull - 36}px)` }}
        >
          <RefreshCwIcon
            className={cn(
              'size-4.5',
              pull >= PULL && 'text-foreground',
              refreshing && 'animate-spin',
            )}
            style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  )
}
