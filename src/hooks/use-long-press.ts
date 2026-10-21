import { useRef, type PointerEvent, type SyntheticEvent } from 'react'

const HOLD_MS = 500

/**
 * A long press by touch (choosing several on a phone, RCP-004): handlers to
 * spread on the element. A scroll or lifting early cancels it, and the tap
 * that ends a long press doesn't also open what was pressed.
 */
export function useLongPress(onLongPress: (() => void) | undefined) {
  const timer = useRef<number | undefined>(undefined)
  const fired = useRef(false)
  const cancel = () => window.clearTimeout(timer.current)
  if (!onLongPress) return {}
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      fired.current = false
      cancel()
      timer.current = window.setTimeout(() => {
        fired.current = true
        onLongPress()
      }, HOLD_MS)
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (e: SyntheticEvent) => {
      if (!fired.current) return
      fired.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    onContextMenu: (e: SyntheticEvent) => {
      if (fired.current) e.preventDefault()
    },
  }
}
