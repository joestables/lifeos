import type * as React from 'react'
import { useLayoutEffect, useRef, type RefObject } from 'react'
import { cn } from '@/lib/utils'

/**
 * An Item's title, typed in place at the top of its popup (components.md):
 * 20px, no box, wrapping onto as many lines as it needs rather than running
 * off the side (Joe, 14 November). One line of words all the same: Enter
 * doesn't break it but does what `onEnter` says (Save on a New dialog),
 * else leaves the field; a pasted line break becomes a space.
 */
export function TitleField({
  value,
  onValueChange,
  onEnter,
  inputRef,
  className,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange' | 'rows' | 'ref'> & {
  value: string
  onValueChange: (value: string) => void
  onEnter?: () => void
  inputRef?: RefObject<HTMLTextAreaElement | null>
}) {
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = inputRef ?? own
  // As tall as its words, where field-sizing isn't known.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || CSS.supports('field-sizing', 'content')) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ref, value])
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label="Title"
      placeholder="Title"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\r?\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (onEnter) onEnter()
        else e.currentTarget.blur()
      }}
      className={cn(
        'field-sizing-content min-w-0 resize-none overflow-hidden bg-transparent pt-1 text-day wrap-anywhere outline-none placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
