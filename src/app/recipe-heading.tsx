import { ChevronDownIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { LabelPicker } from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  addValue,
  createRecipe,
  updateItem,
  updateRecipe,
  usePhotoUrls,
  type FoodData,
  type HeadingPatch,
  type ValueKind,
} from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { useOnLeave } from '@/hooks/use-on-leave'
import { nameTaken, valueChoices } from '@/lib/recipes'
import { keepPhoto, type PhotoChoice } from './keep-photo'
import { PhotoField } from './photo-field'
import { makeDrafts } from './recipe-actions'
import { Field } from './task-details'

type Heading = Required<Pick<HeadingPatch, 'category' | 'cuisine' | 'tags' | 'protein' | 'carbs'>>

const LISTS: { kind: ValueKind; field: 'tags' | 'protein' | 'carbs'; label: string }[] = [
  { kind: 'tag', field: 'tags', label: 'Tags' },
  { kind: 'protein', field: 'protein', label: 'Protein' },
  { kind: 'carb', field: 'carbs', label: 'Carbs' },
]

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * A Recipe's heading in a Dialog (RCP-006 1, patterns.md#recipes): Edit
 * heading on my Recipe; New recipe, which makes a Draft and opens its
 * Variation to fill; or making an Idea a Draft. A name a Recipe I can see
 * has is refused (RCP-006 6); a Draft or Complete Recipe needs a category
 * and a cuisine (RCP-010 6, Joe, 20 October).
 */
export function HeadingDialog({
  food,
  recipe,
  drafting = false,
  onClose,
  onCreated,
  onDrafted,
}: {
  food: FoodData
  /** The Recipe to edit; without one, a new Recipe. */
  recipe?: RecipeView
  /** Making the Idea `recipe` a Draft. */
  drafting?: boolean
  onClose: () => void
  onCreated?: (ids: { recipe: string; variation: string }) => void
  /** The Idea is a Draft now. */
  onDrafted?: () => void
}) {
  const nameId = useId()
  const [name, setName] = useState(recipe?.item.title ?? '')
  const [heading, setHeading] = useState<Heading>({
    category: recipe?.heading.category ?? null,
    cuisine: recipe?.heading.cuisine ?? null,
    tags: recipe?.heading.tags ?? [],
    protein: recipe?.heading.protein ?? [],
    carbs: recipe?.heading.carbs ?? [],
  })
  const [tried, setTried] = useState(false)
  const [photo, setPhotoChoice] = useState<PhotoChoice>(null)
  const current = usePhotoUrls([recipe?.photo?.path]).get(recipe?.photo?.path ?? '')
  const taken = name.trim() ? nameTaken(food.recipes, name, recipe?.item.id) : undefined
  const problem = !name.trim()
    ? 'A recipe needs a name'
    : taken
      ? taken.mine
        ? 'You already have a recipe with this name'
        : 'A recipe in your Household has this name'
      : null
  // An Idea needs neither; anything further, both.
  const needsFacts = !recipe || drafting || recipe.state !== 'idea'
  const missing = needsFacts
    ? [!heading.category && 'category', !heading.cuisine && 'cuisine'].filter(Boolean)
    : []
  const factsProblem = missing.length
    ? `A ${drafting ? 'draft' : 'recipe'} needs a ${missing.join(' and a ')}`
    : null

  const choices = (kind: ValueKind) => valueChoices(food.values, food.recipes, kind)
  // A new name goes into my list as it is chosen (RCP-006 5).
  const remember = (kind: ValueKind, value: string) => {
    if (!food.values.some((v) => v.kind === kind && same(v.name, value))) addValue(kind, value)
  }

  /**
   * Saves, or when `strict` is false (Edit heading closed or left), keeps
   * what can be kept: a name that can't be, or a missing category or
   * cuisine, stays as it was.
   */
  const save = (strict = true) => {
    if (strict) {
      setTried(true)
      if (problem || factsProblem) return
    }
    saved.current = true
    const patch: HeadingPatch = {}
    for (const k of Object.keys(heading) as (keyof Heading)[]) {
      if (!heading[k] && (k === 'category' || k === 'cuisine') && needsFacts) continue
      const was = recipe?.heading[k] ?? (k === 'category' || k === 'cuisine' ? null : [])
      if (JSON.stringify(was) !== JSON.stringify(heading[k]))
        Object.assign(patch, { [k]: heading[k] })
    }
    if (recipe) {
      if (!problem && name.trim() !== recipe.item.title)
        updateItem(recipe.item.id, { title: name.trim() })
      if (Object.keys(patch).length) updateRecipe(recipe.item.id, patch)
      keepPhoto(recipe.item.id, photo, recipe.photo)
      if (drafting) {
        makeDrafts([recipe], false)
        onDrafted?.()
      }
    } else {
      const ids = createRecipe(name.trim(), 'active')
      if (Object.keys(patch).length) updateRecipe(ids.recipe, patch)
      keepPhoto(ids.recipe, photo, undefined)
      onCreated?.(ids)
    }
    if (strict) onClose()
  }
  // Edit heading keeps as it goes (RCP-006 4): closed or swiped back, what
  // was changed is kept. New recipe and Make it a draft have Cancel.
  const editing = recipe !== undefined && !drafting
  const saved = useRef(false)
  const leave = () => {
    if (editing && !saved.current) save(false)
    onClose()
  }
  useOnLeave(() => editing && !saved.current && save(false))

  const single = (kind: 'category' | 'cuisine', label: string, names: string) => {
    const value = heading[kind]
    const options = choices(kind)
    return (
      <Field label={label}>
        <LabelPicker
          name={label}
          names={names}
          trigger={
            <Button
              variant="outline"
              aria-label={label}
              className="w-full justify-between font-normal"
            >
              <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>
                {value ?? 'None'}
              </span>
              <ChevronDownIcon className="text-muted-foreground" />
            </Button>
          }
          labels={options.map((o) => ({ id: o, name: o }))}
          chosen={new Set(value ? [value] : [])}
          onToggle={(v, on) => setHeading((h) => ({ ...h, [kind]: on ? v : null }))}
          onCreate={(v) => {
            remember(kind, v)
            setHeading((h) => ({ ...h, [kind]: v }))
          }}
        />
      </Field>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && leave()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>
            {drafting ? 'Make it a draft' : recipe ? 'Edit heading' : 'New recipe'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <PhotoField current={current} choice={photo} onChoice={setPhotoChoice} />
          <Field label="Name" htmlFor={nameId}>
            <Input
              id={nameId}
              autoComplete="off"
              value={name}
              aria-invalid={(tried && problem !== null) || undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {tried && problem && <p className="text-sm text-destructive">{problem}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {single('category', 'Category', 'Categories')}
            {single('cuisine', 'Cuisine', 'Cuisines')}
          </div>
          {tried && factsProblem && (
            <p className="-mt-2 text-sm text-destructive">{factsProblem}</p>
          )}
          {LISTS.map(({ kind, field, label }) => {
            const chosen = heading[field]
            const set = (next: string[]) => setHeading((h) => ({ ...h, [field]: next }))
            return (
              <Field key={field} label={label}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {chosen.map((v) => (
                    <Badge
                      key={v}
                      removeLabel={`Remove ${v}`}
                      onRemove={() => set(chosen.filter((c) => c !== v))}
                    >
                      {v}
                    </Badge>
                  ))}
                  <LabelPicker
                    name={label === 'Tags' ? 'Tag' : label === 'Carbs' ? 'Carb' : label}
                    names={label}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        Add
                      </Button>
                    }
                    labels={choices(kind).map((o) => ({ id: o, name: o }))}
                    chosen={new Set(chosen)}
                    onToggle={(v, on) =>
                      set(on ? [...chosen, v] : chosen.filter((c) => !same(c, v)))
                    }
                    onCreate={(v) => {
                      remember(kind, v)
                      set([...chosen, v])
                    }}
                  />
                </div>
              </Field>
            )
          })}
          <DialogFooter>
            {(!recipe || drafting) && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit">{drafting ? 'Make it a draft' : recipe ? 'Done' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
