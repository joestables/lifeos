import { useRef, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'

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

/** What a row being reordered is told: its id, how it shows, its handle's events. */
export interface Reorder {
  id: string
  state?: 'dragging' | 'over'
  handle: HTMLAttributes<HTMLElement>
}

/**
 * Reordering rows by dragging a handle (RCP-007 4, RCP-008 1): the row under
 * the pointer is ringed, and letting go moves the dragged row to its place.
 * Each row carries `data-reorder-id`. Alt+↑ and Alt+↓ in a row's field move
 * it by one.
 */
export function useReorder(ids: readonly string[], onMove: (id: string, to: number) => void) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const overRef = useRef<string | null>(null)

  /** While dragging, nothing on the page is selected (a phone's long press would). */
  const holdSelection = (on: boolean) => {
    document.documentElement.style.userSelect = on ? 'none' : ''
    document.documentElement.style.webkitUserSelect = on ? 'none' : ''
    if (on) window.getSelection()?.removeAllRanges()
  }

  const rowAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-reorder-id]')?.dataset.reorderId ??
    null

  const row = (id: string): Reorder => ({
    id,
    state: dragging === id ? 'dragging' : over === id && dragging !== null ? 'over' : undefined,
    handle: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        holdSelection(true)
        setDragging(id)
        overRef.current = id
        setOver(id)
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (dragging !== id) return
        window.getSelection()?.removeAllRanges()
        // Near the top or bottom of the screen, the page scrolls to the rows beyond.
        const edge = 72
        if (e.clientY < edge) scrollBy(e.currentTarget, -(edge - e.clientY) / 4)
        else if (e.clientY > window.innerHeight - edge)
          scrollBy(e.currentTarget, (e.clientY - (window.innerHeight - edge)) / 4)
        const at = rowAt(e.clientX, e.clientY)
        if (at && ids.includes(at) && at !== overRef.current) {
          overRef.current = at
          setOver(at)
        }
      },
      onPointerUp: () => {
        const to = overRef.current
        if (dragging === id && to && to !== id) onMove(id, ids.indexOf(to))
        holdSelection(false)
        setDragging(null)
        setOver(null)
        overRef.current = null
      },
      onPointerCancel: () => {
        holdSelection(false)
        setDragging(null)
        setOver(null)
      },
    },
  })

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
