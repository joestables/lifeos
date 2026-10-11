import type { LucideIcon } from 'lucide-react'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TypeColour } from './colours'

/** How far the row must travel before letting go does the action. */
const THRESHOLD = 96
const MAX = 160

/**
 * One common action on a phone (components.md): drag the row right over a
 * layer in the Type's colour; let go past the threshold to do it. Only
 * touch drags count, and vertical scrolling is left alone.
 */
export function SwipeAction({
  label,
  icon: Icon,
  colour,
  onAction,
  children,
}: {
  label: string
  icon: LucideIcon
  colour: Exclude<TypeColour, 'none'>
  onAction: () => void
  children: ReactNode
}) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const dragged = useRef(false)

  const reset = () => {
    start.current = null
    dragging.current = false
    setDx(0)
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    start.current = { x: e.clientX, y: e.clientY }
    dragged.current = false
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    const x = e.clientX - start.current.x
    const y = e.clientY - start.current.y
    if (!dragging.current) {
      if (Math.abs(y) > 10) return reset()
      if (x < 10) return
      dragging.current = true
      dragged.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDx(Math.max(0, Math.min(MAX, x)))
  }
  const up = () => {
    if (dragging.current && dx >= THRESHOLD) onAction()
    reset()
  }

  return (
    <div
      data-slot="swipe-action"
      data-colour={colour}
      className="relative touch-pan-y overflow-hidden rounded-row"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={reset}
      onClickCapture={(e) => {
        // A drag isn't a tap: it doesn't open the Item.
        if (dragged.current) {
          e.preventDefault()
          e.stopPropagation()
          dragged.current = false
        }
      }}
    >
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center gap-2 bg-tc px-[18px] font-[650] text-tc-foreground [&_svg]:size-4.5',
          dx === 0 && 'invisible',
        )}
      >
        <Icon />
        {label}
      </div>
      <div
        className={cn('relative', dx === 0 && 'transition-transform')}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
