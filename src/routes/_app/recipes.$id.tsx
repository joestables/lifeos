import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader, TypeScope } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Compare } from '@/app/compare'
import { CookDialog, Cooking } from '@/app/cooking'
import { EditVariation } from '@/app/edit-variation'
import { HeadingDialog } from '@/app/recipe-heading'
import { RecipeRead, type RecipeGo } from '@/app/recipe-page'
import { queue, useFood } from '@/data'

export interface RecipeSearch {
  /** Editing my Variation; the heading's Dialog over the page. */
  edit?: 'variation' | 'heading'
  /** The Variation open; else the default. */
  variation?: string
  /** Cooking it (RCP-011). */
  cook?: true
  /** Comparing Variations (RCP-009 4). */
  compare?: true
}

const yes = (v: unknown) => v === true || v === 'true' || v === 1

/**
 * A Recipe's page (RCP-005): reading a Variation, editing it, Cooking it or
 * comparing two, each a mode of the page with its own place in the history.
 */
export const Route = createFileRoute('/_app/recipes/$id')({
  validateSearch: (s: Record<string, unknown>): RecipeSearch => ({
    ...(s.edit === 'variation' || s.edit === 'heading' ? { edit: s.edit } : {}),
    ...(typeof s.variation === 'string' ? { variation: s.variation } : {}),
    ...(yes(s.cook) ? { cook: true as const } : {}),
    ...(yes(s.compare) ? { compare: true as const } : {}),
  }),
  component: RecipeRoute,
})

function RecipeRoute() {
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const food = useFood(queue)
  const [logging, setLogging] = useState(false)
  const recipe = food.byId.get(id)

  if (!recipe) {
    if (food.isLoading) return null
    return (
      <TypeScope colour="green">
        <PageHeader title="This can't be found" />
        <div className="px-5 sm:px-9">
          <Button onClick={() => void navigate({ to: '/recipes' })}>Go to Recipes</Button>
        </div>
      </TypeScope>
    )
  }

  const variation =
    recipe.variations.find((v) => v.item.id === search.variation) ?? recipe.defaultVariation
  const to = (next: RecipeSearch, replace = false) =>
    void navigate({ to: '/recipes/$id', params: { id }, search: next, replace })
  const back = () =>
    router.history.canGoBack() ? router.history.back() : to({ variation: variation?.item.id })
  const go: RecipeGo = {
    variation: (v) => to({ variation: v }, true),
    edit: (v) => to({ variation: v, edit: 'variation' }),
    // A new Variation is read once its editing is done.
    editNew: (v) =>
      void navigate({
        to: '/recipes/$id',
        params: { id },
        search: { variation: v },
        replace: true,
      }).then(() => to({ variation: v, edit: 'variation' })),
    editHeading: () => to({ variation: variation?.item.id, edit: 'heading' }),
    cook: (v) => to({ variation: v, cook: true }),
    compare: () => to({ variation: variation?.item.id, compare: true }),
    logCook: () => setLogging(true),
    recipe: (other) => void navigate({ to: '/recipes/$id', params: { id: other } }),
    library: () => void navigate({ to: '/recipes' }),
  }
  const toLibrary = () =>
    router.history.canGoBack() ? router.history.back() : void navigate({ to: '/recipes' })

  // Editing and Cooking start from everything as kept, never from a half-loaded Variation.
  if (!variation || ((search.edit === 'variation' || search.cook) && food.isLoading)) return null

  if (search.cook && variation.item.status !== 'idea')
    return (
      <TypeScope colour="green">
        <Cooking
          key={variation.item.id}
          recipe={recipe}
          variation={variation}
          food={food}
          onBack={back}
          onRecipe={go.recipe}
          onFinished={() => to({ variation: variation.item.id }, true)}
        />
      </TypeScope>
    )

  if (search.edit === 'variation' && variation.mine)
    return (
      <TypeScope colour="green">
        <PageHeader title="Edit variation" back={{ label: recipe.item.title, onClick: back }} />
        <EditVariation
          key={variation.item.id}
          recipe={recipe}
          variation={variation}
          food={food}
          onDone={back}
        />
      </TypeScope>
    )

  if (search.compare)
    return (
      <TypeScope colour="green">
        <PageHeader title="Compare variations" back={{ label: recipe.item.title, onClick: back }} />
        <Compare recipe={recipe} food={food} />
      </TypeScope>
    )

  return (
    <TypeScope colour="green">
      <PageHeader title={recipe.item.title} back={{ label: 'Recipes', onClick: toLibrary }} />
      <RecipeRead recipe={recipe} variation={variation} food={food} go={go} />
      {search.edit === 'heading' && recipe.mine && (
        <HeadingDialog food={food} recipe={recipe} onClose={back} />
      )}
      {logging && (
        <CookDialog
          past
          variation={variation}
          servings={variation.fields.servings}
          onClose={() => setLogging(false)}
        />
      )}
    </TypeScope>
  )
}
