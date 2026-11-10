import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A line to add one more (components.md): Enter adds what was typed, and the
 * line stays ready for the next.
 */
export function AddRow({
  placeholder,
  onAdd,
  className,
}: {
  /** Its name, as its placeholder: "Add an item". */
  placeholder: string
  onAdd: (text: string) => void
  className?: string
}) {
  const [text, setText] = useState('')
  return (
    <label className={cn('flex min-h-[34px] items-center gap-3 text-muted-foreground', className)}>
      <PlusIcon aria-hidden className="size-[18px] shrink-0" />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            e.preventDefault()
            onAdd(text.trim())
            setText('')
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
}
