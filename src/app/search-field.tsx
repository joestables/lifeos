import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

/** A page's own search, `sm`, with its icon: Recipes, Ideas, the Pantry. */
export function SearchField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        size="sm"
        type="search"
        aria-label={label}
        placeholder={label}
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
