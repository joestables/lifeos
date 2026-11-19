import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { AddChip } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveEntry, type WardrobeEntry, type WardrobeList } from '@/data'

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * "+ Fit", "+ Tag" (WRD-008 2–3): a dashed chip that becomes a small field
 * with Add; a name I have but for case is that one, chosen.
 */
export function NewEntryChip({
  list,
  one,
  entries,
  onMade,
}: {
  list: WardrobeList
  /** "Fit", "Tag". */
  one: string
  entries: readonly WardrobeEntry[]
  onMade: (id: string) => void
}) {
  const [typing, setTyping] = useState(false)
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim()
    if (!n) return setTyping(false)
    const had = entries.find((e) => key(e.name) === key(n))
    onMade(had ? had.id : saveEntry(list, n))
    setName('')
    setTyping(false)
  }
  if (!typing)
    return (
      <AddChip onClick={() => setTyping(true)}>
        <span className="sr-only">New </span>
        {one}
      </AddChip>
    )
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <Input
        size="sm"
        autoFocus
        aria-label={`New ${one.toLowerCase()}`}
        value={name}
        maxLength={40}
        autoComplete="off"
        className="w-36"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            setTyping(false)
          }
        }}
      />
      <Button
        type="submit"
        size="icon-sm"
        variant="outline"
        aria-label={`Add ${one.toLowerCase()}`}
      >
        <CheckIcon />
      </Button>
    </form>
  )
}
