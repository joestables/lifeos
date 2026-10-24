import { ChefHatIcon, Trash2Icon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateItem, updateVariation, usePhotoUrls, type FoodData } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { useOnLeave } from '@/hooks/use-on-leave'
import { nameTaken } from '@/lib/recipes'
import { keepPhoto, type PhotoChoice } from './keep-photo'
import { LinksField } from './links-field'
import { PhotoField } from './photo-field'
import { deleteRecipes } from './recipe-actions'
import { Field } from './task-details'

/**
 * An Idea, open in a popup over Ideas (RCP-002, Joe, 20 October): its name,
 * links, note and photo, and nothing of a recipe's ingredients or method
 * until it is made a Draft. Kept on Done or on closing; someone else's is
 * read-only.
 */
export function IdeaDialog({
  idea,
  food,
  onClose,
  onMakeDraft,
}: {
  idea: RecipeView
  food: FoodData
  onClose: () => void
  /** Make it a Draft: its category and cuisine are asked first. */
  onMakeDraft: () => void
}) {
  const ids = useId()
  const v = idea.defaultVariation
  const mine = idea.mine
  const [name, setName] = useState(idea.item.title)
  const [links, setLinks] = useState(v?.fields.sources.length ? v.fields.sources : [''])
  const [note, setNote] = useState(v?.fields.notes ?? '')
  const [photo, setPhoto] = useState<PhotoChoice>(null)
  const current = usePhotoUrls([idea.photo?.path]).get(idea.photo?.path ?? '')
  const taken = name.trim() ? nameTaken(food.recipes, name, idea.item.id) : undefined
  const problem = !name.trim()
    ? 'An idea needs a name'
    : taken
      ? taken.mine
        ? 'You already have a recipe with this name'
        : 'A recipe in your Household has this name'
      : null

  /** What changed, kept; false, keeping nothing, when the name can't be and `strict`. */
  const keep = (strict = true): boolean => {
    if (!mine) return true
    if (problem && strict) return false
    if (!problem && name.trim() !== idea.item.title)
      updateItem(idea.item.id, { title: name.trim() })
    if (v) {
      const sources = links.map((l) => l.trim()).filter(Boolean)
      const notes = note.trim() || null
      const patch = {
        ...(JSON.stringify(sources) !== JSON.stringify(v.fields.sources) ? { sources } : {}),
        ...(notes !== (v.fields.notes ?? null) ? { notes } : {}),
      }
      if (Object.keys(patch).length) updateVariation(v.item.id, patch)
    }
    keepPhoto(idea.item.id, photo, idea.photo)
    return true
  }
  const kept = useRef(false)
  const popup = useRef<HTMLDivElement>(null)
  // Closed with a name that can't be kept: the rest is still kept, under the old name.
  const close = () => {
    kept.current = true
    keep(false)
    onClose()
  }
  // Swiped back with it open: what was typed is kept.
  useOnLeave(() => !kept.current && keep(false))

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      {/* The popup itself takes the focus, not the name: no keyboard as it
          opens on a phone (Joe, 24 October). */}
      <DialogContent data-colour="green" initialFocus={popup} ref={popup}>
        <DialogHeader>
          <DialogTitle>Idea</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!keep()) return
            kept.current = true
            onClose()
          }}
        >
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              autoComplete="off"
              readOnly={!mine}
              value={name}
              aria-invalid={problem !== null || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {problem && <p className="text-sm text-destructive">{problem}</p>}
          </Field>
          <Field label="Links">
            {mine ? (
              <LinksField links={links} onChange={setLinks} />
            ) : (
              <div className="flex flex-col gap-1 text-sm">
                {v?.fields.sources.map((s) => (
                  <a
                    key={s}
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-tc-text hover:underline"
                  >
                    {s}
                  </a>
                ))}
              </div>
            )}
          </Field>
          <Field label="Note" htmlFor={`${ids}-note`}>
            <Textarea
              id={`${ids}-note`}
              placeholder="Note"
              readOnly={!mine}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {mine && <PhotoField current={current} choice={photo} onChoice={setPhoto} />}
          {/* A phone: Delete and Make it a draft at their own width, Done
              across under them (Joe, 24 October). */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {mine && (
                <Button
                  type="button"
                  variant="ghost-destructive"
                  onClick={() => {
                    kept.current = true
                    onClose()
                    deleteRecipes([idea], 'idea')
                  }}
                >
                  <Trash2Icon /> Delete
                </Button>
              )}
              {mine && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={problem !== null}
                  onClick={() => {
                    if (!keep()) return
                    kept.current = true
                    onMakeDraft()
                  }}
                >
                  <ChefHatIcon /> Make it a draft
                </Button>
              )}
            </div>
            <Button type="submit" className="sm:ml-auto">
              Done
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
