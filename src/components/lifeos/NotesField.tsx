import { StickyNoteIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * An Item's notes in its popup (components.md#notesfield): while it has
 * none, a quiet "Add notes" with a note icon, in line with the fields'
 * labels; chosen, or with notes, a "Notes" Label over a Textarea of one
 * line that grows with its text (Joe, 22 November: the box took too much
 * room).
 */
export function NotesField({
  value,
  onChange,
  onBlur,
}: {
  value: string
  onChange: (notes: string) => void
  onBlur?: () => void
}) {
  const id = useId()
  const [adding, setAdding] = useState(false)
  if (!value && !adding)
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="-mx-1 flex h-8 items-center gap-2 self-start rounded-control px-1 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring-soft [&_svg]:size-4"
      >
        <StickyNoteIcon aria-hidden />
        Add notes
      </button>
    )
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>Notes</Label>
      <Textarea
        id={id}
        rows={1}
        autoFocus={adding && !value}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          onBlur?.()
          // Left empty, it goes back to "Add notes".
          if (!value.trim()) setAdding(false)
        }}
        className="min-h-10"
      />
    </div>
  )
}
