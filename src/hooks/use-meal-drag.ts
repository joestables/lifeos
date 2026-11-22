import { useEffect, useRef, useState } from 'react'
import { holdDrag } from '@/lib/drag-hold'

const HOLD_MS = 400
const SLOP = 8

/** A mouse (or pen) drags as the browser does, as on Week; a finger presses and holds. */
const fine = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches

/**
 * Dragging a Meal to another slot (patterns.md#dragging), or a worn outfit
 * to another day: with a mouse, the browser's own drag and drop, its
 * picture and cursor as Week's (Joe, 22 November); with a finger, after
 * pressing and holding, so a swipe still scrolls. The slot under the
 * pointer is whatever carries `data-drop` ("2026-10-15:dinner"); let go
 * there, `onDrop` gets it.
 */
export function useMealDrag(
  onDrop: (meal: string, drop: string) => void,
  /** Scroll the page while the pointer is near its top or foot (the Wardrobe's Week on a phone). */
  { autoScroll = false }: { autoScroll?: boolean } = {},
) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  /** Where the pointer is while dragging: for a picture that follows it. */
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const latest = useRef(onDrop)
  useEffect(() => {
    latest.current = onDrop
  })
  // A click straight after a drag isn't an open.
  const dragged = useRef(false)

  const start = (meal: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    // A mouse's drag is the browser's: see native below.
    if (e.pointerType !== 'touch' && fine()) return
    const touch = e.pointerType === 'touch'
    const x0 = e.clientX
    const y0 = e.clientY
    let active = false
    let target: string | null = null
    let last = { x: x0, y: y0 }
    let frame = 0
    // Near the top or foot of the screen, the page scrolls under the pointer.
    const EDGE = 72
    const scroll = () => {
      const dy =
        last.y < EDGE
          ? -(EDGE - last.y) / 4
          : last.y > innerHeight - EDGE
            ? (last.y - innerHeight + EDGE) / 4
            : 0
      if (dy) {
        window.scrollBy(0, dy)
        target = at(last.x, last.y)
        setOver(target)
      }
      frame = requestAnimationFrame(scroll)
    }
    const hold = touch ? window.setTimeout(() => begin(), HOLD_MS) : undefined

    function begin() {
      active = true
      // Lifted, the page doesn't pull to refresh (patterns.md#dragging).
      document.documentElement.style.overscrollBehavior = 'none'
      holdDrag(true)
      dragged.current = true
      setDragging(meal)
      setPoint(last)
      navigator.vibrate?.(10)
      if (autoScroll) frame = requestAnimationFrame(scroll)
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
      last = { x, y }
      setPoint(last)
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
      cancelAnimationFrame(frame)
      document.documentElement.style.overscrollBehavior = ''
      document.removeEventListener('pointermove', mouseMove)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', end)
      document.removeEventListener('touchmove', touchMove)
      document.removeEventListener('touchend', up)
      document.removeEventListener('touchcancel', end)
      setDragging(null)
      setOver(null)
      setPoint(null)
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

  // The browser's drag and drop, for a mouse: anything carrying `data-drop`
  // takes it, shaded while over; elsewhere the browser says it can't.
  const native = (meal: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', meal)
    let target: string | null = null
    const dropOf = (ev: DragEvent) =>
      ((ev.target as Element | null)?.closest?.('[data-drop]') as HTMLElement | null)?.dataset
        .drop ?? null
    const onOver = (ev: DragEvent) => {
      target = dropOf(ev)
      setOver(target)
      if (!target) return
      ev.preventDefault()
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
    }
    const drop = (ev: DragEvent) => {
      const at = dropOf(ev)
      if (!at) return
      ev.preventDefault()
      latest.current(meal, at)
      // Moved, the card is drawn afresh where it went: its dragend may never reach the page.
      end()
    }
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      cancelAnimationFrame(frame)
      document.removeEventListener('dragover', onOver)
      document.removeEventListener('drop', drop)
      document.removeEventListener('dragend', end)
      setDragging(null)
      setOver(null)
      window.setTimeout(() => (dragged.current = false))
    }
    document.addEventListener('dragover', onOver)
    document.addEventListener('drop', drop)
    document.addEventListener('dragend', end)
    dragged.current = true
    // After the browser has taken its picture, so the picture isn't faded.
    const frame = requestAnimationFrame(() => setDragging(meal))
  }

  return {
    dragging,
    over,
    point,
    /** Spread on a Meal's card. */
    handle: (meal: string) => ({
      draggable: fine(),
      onDragStart: native(meal),
      onPointerDown: start(meal),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => {
        if (dragged.current) e.stopPropagation()
      },
    }),
  }
}
