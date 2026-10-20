import { ChevronDownIcon, XIcon } from 'lucide-react'
import { useId, useState } from 'react'
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
import { nameTaken, valueChoices } from '@/lib/recipes'
import { keepPhoto, type PhotoChoice } from './keep-photo'
import { PhotoField } from './photo-field'
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
 * heading on my Recipe, or New recipe, which makes a Draft and opens its
 * Variation to fill. A name a Recipe I can see has is refused (RCP-006 6).
 */
export function HeadingDialog({
  food,
  recipe,
  onClose,
  onCreated,
}: {
  food: FoodData
  /** The Recipe to edit; without one, a new Recipe. */
  recipe?: RecipeView
  onClose: () => void
  onCreated?: (ids: { recipe: string; variation: string }) => void
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

  const choices = (kind: ValueKind) => valueChoices(food.values, food.recipes, kind)
  // A new name goes into my list as it is chosen (RCP-006 5).
  const remember = (kind: ValueKind, value: string) => {
    if (!food.values.some((v) => v.kind === kind && same(v.name, value))) addValue(kind, value)
  }

  const save = () => {
    setTried(true)
    if (problem) return
    const patch: HeadingPatch = {}
    for (const k of Object.keys(heading) as (keyof Heading)[]) {
      const was = recipe?.heading[k] ?? (k === 'category' || k === 'cuisine' ? null : [])
      if (JSON.stringify(was) !== JSON.stringify(heading[k]))
        Object.assign(patch, { [k]: heading[k] })
    }
    if (recipe) {
      if (name.trim() !== recipe.item.title) updateItem(recipe.item.id, { title: name.trim() })
      if (Object.keys(patch).length) updateRecipe(recipe.item.id, patch)
      keepPhoto(recipe.item.id, photo, recipe.photo)
    } else {
      const ids = createRecipe(name.trim(), 'active')
      if (Object.keys(patch).length) updateRecipe(ids.recipe, patch)
      keepPhoto(ids.recipe, photo, undefined)
      onCreated?.(ids)
    }
    onClose()
  }

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit heading' : 'New recipe'}</DialogTitle>
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
              autoFocus
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
          {LISTS.map(({ kind, field, label }) => {
            const chosen = heading[field]
            const set = (next: string[]) => setHeading((h) => ({ ...h, [field]: next }))
            return (
              <Field key={field} label={label}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {chosen.map((v) => (
                    <Badge key={v}>
                      {v}
                      <button
                        type="button"
                        aria-label={`Remove ${v}`}
                        onClick={() => set(chosen.filter((c) => c !== v))}
                      >
                        <XIcon />
                      </button>
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
            {!recipe && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit">{recipe ? 'Done' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
