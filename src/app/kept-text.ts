import { useCallback, useEffect, useRef, useState } from 'react'
import { updateItem, type ItemFields } from '@/data'

/** How long typing pauses before it is kept. */
const PAUSE = 400

/** Text kept as it is typed: a short pause, or at once on leaving. */
export function useKeptText(id: string, field: 'title' | 'body' | 'place', initial: string) {
  const [text, setText] = useState(initial)
  const waiting = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (waiting.current === null) return
    // An emptied place is no place.
    const value = field === 'place' && waiting.current.trim() === '' ? null : waiting.current
    updateItem(id, { [field]: value } as ItemFields)
    waiting.current = null
  }, [id, field])
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])
  const change = (value: string) => {
    setText(value)
    waiting.current = value
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, PAUSE)
  }
  return [text, change, flush] as const
}
