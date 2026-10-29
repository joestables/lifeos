import { ChefHatIcon } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Suggestions, TypeTile } from '@/components/lifeos'
import { Textarea } from '@/components/ui/textarea'
import type { RecipeView } from '@/data/food-hooks'
import { suggestRecipes, typedReference } from '@/lib/recipe-parts'

/**
 * A step or the notes, typed (RCP-008 2): "@" suggests up to three of my
 * Recipes, the first highlighted; choosing one writes "@Name", which is
 * kept as a reference to it. Kept on leaving the field.
 */
export function ReferenceField({
  value,
  onChange,
  onCommit,
  refs,
  recipes,
  except,
  label,
  placeholder,
  className,
  autoFocus,
  onEnter,
  onEmptyBackspace,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  /** The names written by choosing, and the Recipe each stands for. */
  refs: Map<string, string>
  recipes: readonly RecipeView[]
  /** The Recipe being edited, never suggested. */
  except?: string
  label: string
  placeholder?: string
  className?: string
  autoFocus?: boolean
  /** Enter without Shift (a step: the next one). */
  onEnter?: () => void
  /** Backspace in an empty box (a step: it goes, Joe, 24 October). */
  onEmptyBackspace?: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [caret, setCaret] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState<number | null>(null)
  const typed = caret === null ? null : typedReference(value, caret)
  const items = typed ? suggestRecipes(recipes, typed.query, except) : []
  const open = typed !== null && items.length > 0 && dismissed !== typed.start

  const choose = (id: string) => {
    const r = items.find((i) => i.item.id === id)
    if (!r || !typed || caret === null) return
    const inserted = `@${r.item.title} `
    refs.set(r.item.title, r.item.id)
    onChange(value.slice(0, typed.start) + inserted + value.slice(caret))
    const at = typed.start + inserted.length
    setCaret(null)
    requestAnimationFrame(() => ref.current?.setSelectionRange(at, at))
  }

  return (
    <Suggestions
      open={open}
      onDismiss={() => typed && setDismissed(typed.start)}
      width="sm"
      query={typed?.query ?? ''}
      items={items.map((r) => ({
        key: r.item.id,
        label: r.item.title,
        icon: <TypeTile colour="green" icon={ChefHatIcon} size="sm" />,
      }))}
      active={Math.min(active, items.length - 1)}
      onChoose={choose}
      field={
        <Textarea
          ref={ref}
          aria-label={label}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={className}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setCaret(e.target.selectionStart)
            setActive(0)
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onBlur={() => {
            setCaret(null)
            onCommit()
          }}
          onKeyDown={(e) => {
            if (open) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                const step = e.key === 'ArrowDown' ? 1 : -1
                setActive((a) => (a + step + items.length) % items.length)
                return
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                choose(items[Math.min(active, items.length - 1)]!.item.id)
                return
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setDismissed(typed!.start)
                return
              }
            }
            if (e.key === 'Enter' && !e.shiftKey && onEnter) {
              e.preventDefault()
              onEnter()
              return
            }
            if (e.key === 'Backspace' && value === '' && onEmptyBackspace) {
              e.preventDefault()
              onEmptyBackspace()
              return
            }
            onKeyDown?.(e)
          }}
        />
      }
    />
  )
}
