import type { ImportAnswer, ImportedRecipe } from '@lifeos/food'
import { CircleCheckIcon, CircleIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import { importRecipe, type FoodData } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { savedWith } from '@/lib/recipes'
import { AI_REFUSALS } from './ai-words'
import type { PendingImport } from './import-store'
import { Field } from './task-details'

const STAGES = ['Reading the page', 'Writing it up', 'Matching the Pantry']

type Step =
  | { at: 'link' }
  | { at: 'saved'; recipe: RecipeView }
  | { at: 'working'; stage: number }
  | { at: 'choose'; answer: Extract<ImportAnswer, { ok: true }> }
  | { at: 'refused'; message: string }

/**
 * Import (RCP-014, patterns.md#recipes): a link, then its progress, then
 * the recipe to check. A link saved before says where first; a page of
 * several recipes asks which; a page that isn't one says so.
 */
export function ImportDialog({
  food,
  idea,
  onClose,
  onChecked,
  onOpen,
  into,
  onContinue,
  choice,
}: {
  food: FoodData
  /** My Idea, imported from its link (RCP-014 4). */
  idea?: RecipeView
  /**
   * Importing into a Draft Variation (RCP-014 10): titled so, and saying it
   * replaces what is there when something is.
   */
  into?: { replacing: boolean }
  onClose: () => void
  onChecked: (pending: PendingImport) => void
  /** Opens a Recipe or Idea the link was saved in. */
  onOpen?: (recipe: RecipeView) => void
  /**
   * Closed while it works: the import goes on without the Dialog (Joe, 23
   * October), its answer handed over to be kept when it comes.
   */
  onContinue?: (work: Promise<ImportAnswer>, link: string) => void
  /** A page of several, read while the Dialog was closed: choosing one. */
  choice?: { link: string; answer: Extract<ImportAnswer, { ok: true }> }
}) {
  const linkId = useId()
  const [link, setLink] = useState(choice?.link ?? idea?.defaultVariation?.fields.sources[0] ?? '')
  const [step, setStep] = useState<Step>(
    choice ? { at: 'choose', answer: choice.answer } : { at: 'link' },
  )
  const [chosen, setChosen] = useState(0)
  const work = useRef<Promise<ImportAnswer> | null>(null)
  const live = useRef(true)
  useEffect(() => () => void (live.current = false), [])

  const checked = (recipe: ImportedRecipe, photo: string | null) =>
    onChecked({ recipe, photo, link: link.trim(), ...(idea ? { idea: idea.item.id } : {}) })

  const run = async () => {
    setStep({ at: 'working', stage: 0 })
    // The page is read, then written up: one request, so the first line
    // gives way after a moment.
    const next = setTimeout(() => live.current && setStep({ at: 'working', stage: 1 }), 2500)
    work.current = importRecipe(link.trim())
    const answer = await work.current
    clearTimeout(next)
    if (!live.current) return
    if (!answer.ok) {
      setStep({ at: 'refused', message: AI_REFUSALS[answer.reason] })
      return
    }
    setStep({ at: 'working', stage: 2 })
    await new Promise((r) => setTimeout(r, 300))
    if (!live.current) return
    if (answer.recipes.length === 1) checked(answer.recipes[0]!, answer.photo)
    else setStep({ at: 'choose', answer })
  }

  const start = () => {
    if (!link.trim()) return
    const saved = idea || into ? undefined : savedWith(food.recipes, link)
    if (saved) setStep({ at: 'saved', recipe: saved })
    else void run()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open) return
        if (step.at === 'working' && work.current && onContinue)
          onContinue(work.current, link.trim())
        onClose()
      }}
    >
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>
            {into ? 'Import from a link' : idea ? 'Import from its link' : 'Import'}
          </DialogTitle>
        </DialogHeader>
        {step.at === 'link' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              start()
            }}
          >
            <Field label="Link" htmlFor={linkId}>
              <Input
                id={linkId}
                type="url"
                inputMode="url"
                autoFocus
                autoComplete="off"
                placeholder="https://"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </Field>
            {into?.replacing && (
              <p className="text-sm text-muted-foreground">
                This replaces the ingredients and method
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!link.trim()}>
                Import
              </Button>
            </DialogFooter>
          </form>
        )}
        {step.at === 'saved' && (
          <>
            <p>
              Already saved in <span className="font-semibold">{step.recipe.item.title}</span>
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpen?.(step.recipe)}>
                Open
              </Button>
              <Button variant="outline" onClick={() => void run()}>
                Import anyway
              </Button>
            </DialogFooter>
          </>
        )}
        {step.at === 'working' && (
          <ol aria-label="Progress" className="flex flex-col gap-2.5">
            {STAGES.map((s, i) => (
              <li
                key={s}
                className={
                  i > step.stage
                    ? 'flex items-center gap-2.5 text-muted-foreground'
                    : 'flex items-center gap-2.5'
                }
              >
                {i < step.stage ? (
                  <CircleCheckIcon
                    aria-label="Done"
                    className="size-5 fill-primary text-primary-foreground"
                  />
                ) : i === step.stage ? (
                  <LoaderCircleIcon aria-label="Working" className="size-5 animate-spin" />
                ) : (
                  <CircleIcon aria-hidden className="size-5" />
                )}
                {s}
              </li>
            ))}
          </ol>
        )}
        {step.at === 'choose' && (
          <>
            <p className="text-muted-foreground">
              The page has {step.answer.recipes.length} recipes
            </p>
            <RadioGroup
              aria-label="Recipe"
              value={String(chosen)}
              onValueChange={(v) => setChosen(Number(v))}
            >
              {step.answer.recipes.map((r, i) => (
                <RadioCard
                  key={i}
                  value={String(i)}
                  title={r.name}
                  description={`${r.lines.length} ingredients · ${r.steps.length} steps`}
                />
              ))}
            </RadioGroup>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => checked(step.answer.recipes[chosen]!, step.answer.photo)}>
                Check it
              </Button>
            </DialogFooter>
          </>
        )}
        {step.at === 'refused' && (
          <>
            <p>{step.message}</p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
