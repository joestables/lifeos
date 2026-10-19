import { toast } from '@/components/ui/sonner'
import { archiveItem, restoreItem, updateItem } from '@/data'
import type { RecipeView } from '@/data/food-hooks'

const what = (rs: readonly RecipeView[], noun: string) =>
  rs.length === 1 ? `"${rs[0]!.item.title}"` : `${rs.length} ${noun}s`

/**
 * Archives Recipes, and with them every Variation (RCP-010 4); Undo brings
 * each back as it was, the server restoring its Variations' states.
 */
export function archiveRecipes(rs: readonly RecipeView[], noun = 'recipe') {
  const was = rs.map((r) => [r.item.id, r.state] as const)
  for (const [id] of was) updateItem(id, { status: 'cancelled' })
  toast(`Archived ${what(rs, noun)}`, {
    action: {
      label: 'Undo',
      onClick: () => {
        for (const [id, state] of was) updateItem(id, { status: state })
      },
    },
  })
}

/** Deletes to Recently deleted (ADR-0032), with Undo (RCP-004). */
export function deleteRecipes(rs: readonly RecipeView[], noun = 'recipe') {
  for (const r of rs) archiveItem(r.item.id)
  toast(`Deleted ${what(rs, noun)}`, {
    action: {
      label: 'Undo',
      onClick: () => {
        for (const r of rs) restoreItem(r.item.id)
      },
    },
  })
}

/**
 * Makes Ideas Drafts (RCP-002 3): my Variations still Ideas become Drafts,
 * keeping their name, links and notes; the Recipe follows.
 */
export function makeDrafts(rs: readonly RecipeView[]) {
  const ids = rs.flatMap((r) =>
    r.variations.filter((v) => v.mine && v.item.status === 'idea').map((v) => v.item.id),
  )
  for (const id of ids) updateItem(id, { status: 'active' })
  toast(rs.length === 1 ? `"${rs[0]!.item.title}" is a draft` : `${rs.length} drafts made`, {
    action: {
      label: 'Undo',
      onClick: () => {
        for (const id of ids) updateItem(id, { status: 'idea' })
      },
    },
  })
}
