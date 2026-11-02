import { useEffect, useRef, useState } from 'react'
import { holdDrag } from '@/lib/drag-hold'

const HOLD_MS = 400
const SLOP = 8

/**
 * Dragging a Meal to another slot (patterns.md#meal-plan): with a mouse,
 * once it has moved a little; with a finger, after pressing and holding,
 * so a swipe still scrolls. The slot under the pointer is whatever carries
 * `data-drop` ("2026-10-15:dinner"); let go there, `onDrop` gets it.
 */
export function useMealDrag(onDrop: (meal: string, drop: string) => void) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const latest = useRef(onDrop)
  useEffect(() => {
    latest.current = onDrop
  })
  // A click straight after a drag isn't an open.
  const dragged = useRef(false)

  const start = (meal: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const touch = e.pointerType === 'touch'
    const x0 = e.clientX
    const y0 = e.clientY
    let active = false
    let target: string | null = null
    const hold = touch ? window.setTimeout(() => begin(), HOLD_MS) : undefined

    function begin() {
      active = true
      // Lifted, the page doesn't pull to refresh (patterns.md#dragging).
      document.documentElement.style.overscrollBehavior = 'none'
      holdDrag(true)
      dragged.current = true
      setDragging(meal)
      navigator.vibrate?.(10)
    }
    const at = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset
        .drop ?? null
    const moveTo = (x: number, y: number) => {
      const far = Math.hypot(x - x0, y - y0) > SLOP
      if (!active) {
        if (!far) return
        // A finger moving before the hold is a scroll; a mouse moving is a drag.
        if (touch) return end()
        begin()
      }
      target = at(x, y)
      setOver(target)
    }
    const up = () => {
      if (active && target) latest.current(meal, target)
      end()
    }
    // A mouse is followed by its pointer events. A finger by its touch
    // events: the browser cancels the pointer once it means to scroll, but
    // the touch goes on, and once dragging its moves are held from scrolling.
    const mouseMove = (ev: PointerEvent) => moveTo(ev.clientX, ev.clientY)
    const touchMove = (ev: TouchEvent) => {
      const t = ev.touches[0]
      if (!t) return
      if (active && ev.cancelable) ev.preventDefault()
      moveTo(t.clientX, t.clientY)
    }
    function end() {
      if (active) holdDrag(false)
      active = false
      window.clearTimeout(hold)
      document.documentElement.style.overscrollBehavior = ''
      document.removeEventListener('pointermove', mouseMove)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', end)
      document.removeEventListener('touchmove', touchMove)
      document.removeEventListener('touchend', up)
      document.removeEventListener('touchcancel', end)
      setDragging(null)
      setOver(null)
      window.setTimeout(() => (dragged.current = false))
    }
    if (touch) {
      document.addEventListener('touchmove', touchMove, { passive: false })
      document.addEventListener('touchend', up)
      document.addEventListener('touchcancel', end)
    } else {
      document.addEventListener('pointermove', mouseMove)
      document.addEventListener('pointerup', up)
      document.addEventListener('pointercancel', end)
    }
  }

  return {
    dragging,
    over,
    /** Spread on a Meal's card. */
    handle: (meal: string) => ({
      onPointerDown: start(meal),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => {
        if (dragged.current) e.stopPropagation()
      },
    }),
  }
}
