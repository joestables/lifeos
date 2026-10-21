import { PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Any number of links, each an Input with an X that removes it, and "Add a
 * link" (RCP-002 1). Always at least one box, empty or not.
 */
export function LinksField({
  links,
  onChange,
  onLeave,
  label = 'Link',
}: {
  links: string[]
  onChange: (links: string[]) => void
  /** A box left, or a link removed: the list is kept. */
  onLeave?: (links: string[]) => void
  label?: string
}) {
  const shown = links.length ? links : ['']
  return (
    <div className="flex flex-col gap-2">
      {shown.map((l, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            type="url"
            inputMode="url"
            aria-label={`${label} ${i + 1}`}
            placeholder="Link"
            value={l}
            onChange={(e) => onChange(shown.map((x, j) => (j === i ? e.target.value : x)))}
            onBlur={() => onLeave?.(shown)}
          />
          {(l || shown.length > 1) && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              className="shrink-0"
              onClick={() => {
                const next = shown.filter((_, j) => j !== i)
                onChange(next.length ? next : [''])
                onLeave?.(next)
              }}
            >
              <XIcon />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        onClick={() => onChange([...shown, ''])}
      >
        <PlusIcon /> Add a link
      </Button>
    </div>
  )
}
