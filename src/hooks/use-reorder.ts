import { useRef, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'
import { holdDrag } from '@/lib/drag-hold'

/**
 * What a row being reordered is told: its id, how it shows (faded while
 * dragged; a line before or after it where the dragged row will go), its
 * handle's events.
 */
export interface Reorder {
  id: string
  state?: 'dragging' | 'before' | 'after'
  handle: HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void }
}

/** Scrolls the nearest scrolling container of `el` (else the page) by `dy`. */
function scrollBy(el: HTMLElement, dy: number) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) {
      p.scrollTop += dy
      return
    }
  }
  window.scrollBy(0, dy)
}

/** A finger's moves are the drag's, not the page's: no scrolling, no pull to refresh. */
const holdTouch = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault()
}

const held = new WeakSet<HTMLElement>()

/**
 * A handle's touches are never the page's (Joe, 3 November): a phone decides
 * to scroll or pull to refresh as a touch starts, before any listener added
 * then can stop it, and iOS ignores `touch-action` for pulling to refresh;
 * so the handle itself cancels its touches, from the start, without passive
 * listeners. Its pointer events still come, and drive the drag.
 */
function holdHandle(el: HTMLElement | null) {
  if (!el || held.has(el)) return
  held.add(el)
  el.addEventListener('touchstart', holdTouch, { passive: false })
  el.addEventListener('touchmove', holdTouch, { passive: false })
}

let holding = false

/** While dragging, nothing on the page is selected, scrolled or pulled to refresh. */
function holdPage(on: boolean) {
  if (on !== holding) holdDrag(on)
  holding = on
  const root = document.documentElement.style
  root.userSelect = on ? 'none' : ''
  root.webkitUserSelect = on ? 'none' : ''
  root.overscrollBehavior = on ? 'none' : ''
  if (on) {
    window.getSelection()?.removeAllRanges()
    document.addEventListener('touchmove', holdTouch, { passive: false })
  } else document.removeEventListener('touchmove', holdTouch)
}

/**
 * Where a drag from `from` lets go, as an index among the rows less the one
 * dragged; null if it would stay where it is. `slot` is the gap it is over,
 * 0 before the first row to `count` after the last.
 */
export function dropIndex(from: number, slot: number): number | null {
  if (slot === from || slot === from + 1) return null
  return slot > from ? slot - 1 : slot
}

/**
 * Reordering rows by dragging a handle (patterns.md#dragging; RCP-007 4,
 * GYM-006 3): the row dragged fades, a line shows in the gap it will go to,
 * nearest the pointer, and letting go moves it there. Each row carries
 * `data-reorder-id`. Alt+↑ and Alt+↓ in a row's field move it by one.
 */
export function useReorder(ids: readonly string[], onMove: (id: string, to: number) => void) {
  const [dragging, setDragging] = useState<string | null>(null)
  // The gap the dragged row will go to: 0 before the first row … ids.length after the last.
  const [slot, setSlot] = useState<number | null>(null)
  const slotRef = useRef<number | null>(null)

  const slotAt = (x: number, y: number): number | null => {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-reorder-id]')
    const at = row ? ids.indexOf(row.dataset.reorderId ?? '') : -1
    if (!row || at < 0) return null
    const { top, height } = row.getBoundingClientRect()
    return y < top + height / 2 ? at : at + 1
  }

  const end = () => {
    holdPage(false)
    setDragging(null)
    setSlot(null)
    slotRef.current = null
  }

  const from = dragging === null ? -1 : ids.indexOf(dragging)
  const shown = dragging !== null && slot !== null && dropIndex(from, slot) !== null ? slot : null

  const row = (id: string): Reorder => {
    const i = ids.indexOf(id)
    return {
      id,
      state:
        dragging === id
          ? 'dragging'
          : shown === i
            ? 'before'
            : shown === ids.length && i === ids.length - 1
              ? 'after'
              : undefined,
      handle: {
        ref: holdHandle,
        onPointerDown: (e: PointerEvent<HTMLElement>) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          holdPage(true)
          setDragging(id)
          slotRef.current = null
          setSlot(null)
        },
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          if (dragging !== id) return
          window.getSelection()?.removeAllRanges()
          // Near the top or bottom of the screen, the page scrolls to the rows beyond.
          const edge = 72
          if (e.clientY < edge) scrollBy(e.currentTarget, -(edge - e.clientY) / 4)
          else if (e.clientY > window.innerHeight - edge)
            scrollBy(e.currentTarget, (e.clientY - (window.innerHeight - edge)) / 4)
          const at = slotAt(e.clientX, e.clientY)
          if (at !== null && at !== slotRef.current) {
            slotRef.current = at
            setSlot(at)
          }
        },
        onPointerUp: () => {
          const at = slotRef.current
          const to = dragging === id && at !== null ? dropIndex(ids.indexOf(id), at) : null
          if (to !== null) onMove(id, to)
          end()
        },
        onPointerCancel: end,
      },
    }
  }

  /** Alt+↑ / Alt+↓ on a row's field. */
  const keys = (id: string) => (e: KeyboardEvent) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    const from = ids.indexOf(id)
    const to = from + (e.key === 'ArrowUp' ? -1 : 1)
    if (to < 0 || to >= ids.length) return
    e.preventDefault()
    onMove(id, to)
  }

  return { row, keys }
}
