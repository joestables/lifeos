import { formatTimer } from '@lifeos/food'
import { useEffect, useState } from 'react'
import {
  DateField,
  IngredientList,
  MethodSteps,
  PageHeader,
  RecipeColumns,
  RecipePanel,
  ServingsStepper,
  StarRating,
  TimerChip,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { logCook, removeCook, updateCook, type Cook, type FoodData } from '@/data'
import type { RecipeView, VariationView } from '@/data/food-hooks'
import { useWakeLock } from '@/hooks/use-wake-lock'
import { isoDayOf } from '@/lib/dates'
import { ingredientGroups, methodSteps } from '@/lib/recipe-parts'
import { cookTimers, cooking, secondsLeft, useCookTimers } from './cooking-store'
import { titlesOf } from './recipe-helpers'

/** "How did it go?" (RCP-012 1, 3): stars and notes, both optional, for a cook now or on a day. */
export function CookDialog({
  variation,
  servings,
  past = false,
  cook,
  onClose,
  onLogged,
}: {
  variation: VariationView
  servings: number | null
  /** My cook already logged, to change its verdict and notes (RCP-013 4). */
  cook?: Cook
  /** Log a cook: one from earlier, on the day I choose. */
  past?: boolean
  onClose: () => void
  onLogged?: () => void
}) {
  const [verdict, setVerdict] = useState(cook?.verdict ?? 0)
  const [notes, setNotes] = useState(cook?.notes ?? '')
  const [day, setDay] = useState<string | null>(isoDayOf(new Date()))
  const save = () => {
    if (cook) {
      updateCook(cook.id, { verdict: verdict || null, notes: notes.trim() || null })
      onClose()
      return
    }
    const today = isoDayOf(new Date())
    // A day before today is kept at its midday, so it stays that day wherever it's read.
    const cookedAt =
      past && day && day !== today ? new Date(`${day}T12:00:00`).toISOString() : undefined
    const id = logCook(variation.item.id, {
      ...(cookedAt ? { cooked_at: cookedAt } : {}),
      ...(verdict ? { verdict } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(servings ? { servings } : {}),
    })
    onClose()
    onLogged?.()
    toast('Cook logged', { action: { label: 'Undo', onClick: () => removeCook(id) } })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-colour="green">
        <DialogHeader>
          <DialogTitle>{past ? 'Log a cook' : 'How did it go?'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {past && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cooked-on">Cooked on</Label>
              <DateField id="cooked-on" value={day} onChange={setDay} />
            </div>
          )}
          <StarRating value={verdict} onChange={setVerdict} />
          <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          {past || cook ? (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                onClose()
                onLogged?.()
              }}
            >
              Don’t log
            </Button>
          )}
          <Button onClick={save} disabled={past && !day}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Cooking (RCP-011): the ingredients and method large, the screen awake,
 * servings scaling the ingredients, the step I'm on picked out, a timer for
 * a step that names a time. Kept on this device until I finish, so leaving
 * and coming back finds it as it was.
 */
export function Cooking({
  recipe,
  variation,
  food,
  onBack,
  onRecipe,
  onFinished,
}: {
  recipe: RecipeView
  variation: VariationView
  food: FoodData
  onBack: () => void
  onRecipe: (id: string) => void
  onFinished: () => void
}) {
  useWakeLock()
  const base = variation.fields.servings
  const [state, setState] = useState(
    () =>
      cooking.get(variation.item.id) ?? {
        variation: variation.item.id,
        servings: base,
        current: null,
      },
  )
  useEffect(() => cooking.set(state), [state])
  const [finishing, setFinishing] = useState(false)
  const { timers, now } = useCookTimers()
  const servings = state.servings ?? base
  const factor = base && servings ? servings / base : 1
  const groups = ingredientGroups(variation.lines, food.pantry, factor)
  const steps = methodSteps(variation.steps, titlesOf(food))
  const current = state.current ?? steps[0]?.key ?? null
  const at = steps.findIndex((s) => s.key === current)
  const finish = () => {
    cooking.end(variation.item.id)
    cookTimers.clear(recipe.item.id)
    onFinished()
  }

  const stepper = base !== null && (
    <ServingsStepper
      value={servings ?? base}
      onChange={(n) => setState((s) => ({ ...s, servings: n }))}
    />
  )

  return (
    <>
      <PageHeader
        back={{ label: 'Recipe', onClick: onBack }}
        eyebrow={`Cooking · ${variation.item.title}`}
        title={recipe.item.title}
        trailing={
          <div className="flex items-center gap-3">
            <div className="max-md:hidden">{stepper}</div>
            <Button onClick={() => setFinishing(true)}>Finish</Button>
          </div>
        }
      />
      <div className="flex flex-col gap-4 px-5 pb-12 sm:px-9">
        <RecipeColumns layout="cooking">
          <RecipePanel
            title="Ingredients"
            action={stepper && <div className="md:hidden">{stepper}</div>}
          >
            {groups.length ? (
              <IngredientList cooking groups={groups} />
            ) : (
              <p className="text-sm text-muted-foreground">No ingredients</p>
            )}
          </RecipePanel>
          <RecipePanel
            title="Method"
            action={factor !== 1 && <Badge variant="outline">Not scaled</Badge>}
          >
            <MethodSteps
              cooking
              current={current ?? undefined}
              done={at > 0 ? steps.slice(0, at).map((s) => s.key) : []}
              onStep={(key) => setState((s) => ({ ...s, current: key }))}
              onRecipe={({ id }) => id && onRecipe(id)}
              steps={steps.map((s, i) => {
                if (!s.time) return s
                const key = `${variation.item.id}:${s.key}`
                const t = timers.find((x) => x.key === key)
                const label = `Step ${i + 1}`
                return {
                  ...s,
                  timer: t ? (
                    <TimerChip
                      label={label}
                      time={formatTimer(secondsLeft(t, now))}
                      state={t.done ? 'done' : t.endsAt === null ? 'paused' : 'running'}
                      onPause={() => cookTimers.pause(key)}
                      onResume={() => cookTimers.resume(key)}
                      onStop={() => cookTimers.stop(key)}
                    />
                  ) : (
                    <TimerChip
                      time={formatTimer(s.time.seconds)}
                      onStart={() =>
                        cookTimers.start({
                          key,
                          recipe: recipe.item.id,
                          title: recipe.item.title,
                          label,
                          seconds: s.time!.seconds,
                        })
                      }
                    />
                  ),
                }
              })}
            />
          </RecipePanel>
        </RecipeColumns>
      </div>
      {finishing && (
        <CookDialog
          variation={variation}
          servings={servings}
          onClose={() => setFinishing(false)}
          onLogged={finish}
        />
      )}
    </>
  )
}
