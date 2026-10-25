import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CheckIcon, ChefHatIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TypeScope, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { keepShared, keepWaiting, useFillShared } from '@/app/share-actions'
import { authReady, queue, savedSource, usePhotoUrls, useFood } from '@/data'
import { cleanLink, savedWith, sharedLink, siteOf, type Shared } from '@/lib/share'

/**
 * Where Android's share sheet sends a link (RCP-003, ADR-0055): the
 * manifest's share_target opens /share?title=…&text=…&url=…. Signed out, the
 * share waits while I sign in, then carries on.
 */
export const Route = createFileRoute('/share')({
  validateSearch: (s: Record<string, unknown>): Shared => ({
    ...(typeof s.title === 'string' && { title: s.title }),
    ...(typeof s.text === 'string' && { text: s.text }),
    ...(typeof s.url === 'string' && { url: s.url }),
  }),
  beforeLoad: async ({ search }) => {
    if ((await authReady()).status !== 'signed-in') {
      keepWaiting(search)
      throw redirect({ to: '/sign-in' })
    }
  },
  component: SharePage,
})

type Outcome =
  | { kind: 'saved'; recipe: string; name: string }
  | { kind: 'before'; recipe: string | null; variation?: string }
  | { kind: 'nothing' }

/**
 * Saved as an idea (patterns.md#shopping, RCP-003): the Idea kept at once,
 * with nothing to type or press; a link saved before isn't kept again, and
 * the page names it, with Open. Installed, it closes back to the app shared
 * from, where Android allows it.
 */
function SharePage() {
  const shared = Route.useSearch()
  const navigate = useNavigate()
  const food = useFood(queue)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const started = useRef(false)
  const link = sharedLink(shared)
  useFillShared()

  useEffect(() => {
    if (started.current || food.isLoading) return
    started.current = true
    void (async () => {
      if (!link) return setOutcome({ kind: 'nothing' })
      const known = savedWith(link, food.recipes)
      if (known) return setOutcome({ kind: 'before', recipe: known.item.id })
      // Saved on another device: the server knows, when there's signal.
      if (navigator.onLine) {
        const variation = await savedSource([link, `${link}/`]).catch(() => null)
        if (variation) return setOutcome({ kind: 'before', recipe: null, variation })
      }
      const kept = keepShared(food, shared)
      setOutcome(kept ? { kind: 'saved', ...kept } : { kind: 'nothing' })
      // Back to the app shared from, where Android lets an installed app close.
      if (kept && window.matchMedia('(display-mode: standalone)').matches)
        setTimeout(() => window.close(), 1500)
    })()
  }, [food, link, shared])

  const recipeId =
    outcome?.kind === 'saved'
      ? outcome.recipe
      : outcome?.kind === 'before'
        ? (outcome.recipe ??
          (outcome.variation ? food.recipeOf.get(outcome.variation) : undefined) ??
          null)
        : null
  const recipe = recipeId ? food.byId.get(recipeId) : undefined
  const photo = usePhotoUrls([recipe?.photo?.path]).get(recipe?.photo?.path ?? '')
  const before = outcome?.kind === 'before'
  const name =
    recipe?.item.title ?? (outcome?.kind === 'saved' ? outcome.name : link ? siteOf(link) : '')

  if (!outcome) return <main className="min-h-dvh bg-background" />
  if (outcome.kind === 'nothing')
    return (
      <TypeScope colour="green">
        <main className="flex min-h-dvh flex-col items-center gap-4 bg-background px-6 pt-40 text-center">
          <h1 className="text-h2">No link to save</h1>
          <Button variant="outline" size="sm" onClick={() => void navigate({ to: '/recipes' })}>
            Recipes
          </Button>
        </main>
      </TypeScope>
    )
  return (
    <TypeScope colour="green">
      <main className="flex min-h-dvh flex-col items-center gap-4 bg-background px-6 pt-40 text-center">
        <TypeTile colour="green" icon={before ? ChefHatIcon : CheckIcon} size="lg" />
        <h1 className="text-h2">{before ? 'Already saved' : 'Saved as an idea'}</h1>
        <Card className="w-full max-w-xs flex-row items-center gap-3 p-2.5 text-left">
          {photo ? (
            <img src={photo} alt="" className="size-12 shrink-0 rounded-sm object-cover" />
          ) : (
            <div className="size-12 shrink-0 rounded-sm bg-muted" />
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{name}</span>
            {link && (
              <span className="truncate text-xs text-muted-foreground">
                {siteOf(cleanLink(link))}
              </span>
            )}
          </div>
        </Card>
        {before && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              // An Idea opens in its popup on Ideas (RCP-002), a Recipe its page.
              recipe?.state === 'idea'
                ? void navigate({ to: '/recipes', search: { tab: 'ideas', idea: recipe.item.id } })
                : recipeId
                  ? void navigate({ to: '/recipes/$id', params: { id: recipeId } })
                  : outcome.kind === 'before' &&
                    outcome.variation &&
                    void navigate({ to: '/item/$id', params: { id: outcome.variation } })
            }
          >
            Open
          </Button>
        )}
      </main>
    </TypeScope>
  )
}
