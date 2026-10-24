import { parseLine, type ParsedLine } from '@lifeos/food'
import { PlusIcon, TypeIcon } from 'lucide-react'
import { useState } from 'react'
import { Suggestions } from '@/components/lifeos'
import { Input } from '@/components/ui/input'
import type { PantryEntry } from '@/data'
import { AISLES, pantryMatches, type Aisle } from '@/lib/pantry'

/**
 * A field that adds from the Pantry as it is typed (SHP-003 1, SHP-005 1):
 * its matches, household items too, then what to do with a name the Pantry
 * hasn't. An amount typed first ("2 milk") comes with what is chosen.
 * Enter takes the highlighted match; the field clears, ready for the next.
 */
export function PantryPicker({
  pantry,
  label,
  typedLabel,
  onPick,
}: {
  pantry: ReadonlyMap<string, PantryEntry>
  /** Its name, as its placeholder: "Add to the shop". */
  label: string
  /** What a name the Pantry hasn't becomes: `Add "chick" as typed`. */
  typedLabel: (name: string) => string
  onPick: (choice: { pantry: PantryEntry } | { text: string }, amount: ParsedLine) => void
}) {
  const [value, setValue] = useState('')
  const [active, setActive] = useState(0)
  const parsed = parseLine(value)
  const matches = parsed.name ? pantryMatches(pantry, parsed.name) : []
  const exact = matches.find((m) => m.name.toLowerCase() === parsed.name.trim().toLowerCase())
  const pick = (choice: { pantry: PantryEntry } | { text: string }) => {
    onPick(choice, parsed)
    setValue('')
    setActive(0)
  }
  const typed = () => pick(exact ? { pantry: exact } : { text: parsed.name })
  return (
    <Suggestions
      open={parsed.name.trim() !== ''}
      onDismiss={() => setValue('')}
      title="Pantry"
      query={parsed.name}
      items={matches.map((p) => ({
        key: p.id,
        label: p.name,
        meta: p.kind === 'household' ? 'Household' : p.aisle ? AISLES[p.aisle as Aisle] : undefined,
      }))}
      active={Math.min(active, Math.max(matches.length - 1, 0))}
      onChoose={(id) => {
        const p = pantry.get(id)
        if (p) pick({ pantry: p })
      }}
      actions={
        exact
          ? []
          : [
              {
                key: 'typed',
                label: typedLabel(parsed.name.trim()),
                icon: <TypeIcon />,
                onClick: typed,
              },
            ]
      }
      field={
        <div className="relative">
          <PlusIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={label}
            placeholder={label}
            autoComplete="off"
            className="pl-9"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, Math.max(matches.length - 1, 0)))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && parsed.name.trim()) {
                e.preventDefault()
                const m = matches[Math.min(active, matches.length - 1)]
                if (m) pick({ pantry: m })
                else typed()
              }
            }}
          />
        </div>
      }
    />
  )
}
