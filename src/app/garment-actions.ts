import { toast } from '@/components/ui/sonner'
import { archiveItem, restoreItem, retireGarment, type GarmentView } from '@/data'

const what = (gs: readonly GarmentView[]) =>
  gs.length === 1 ? `"${gs[0]!.title}"` : `${gs.length} garments`

/** Retired (WRD-013 1): off the Wardrobe tab, kept in outfits and on days, with Undo. */
export function retireGarments(gs: readonly GarmentView[]) {
  for (const g of gs) retireGarment(g.item.id)
  toast(`Retired ${what(gs)}`, {
    action: {
      label: 'Undo',
      onClick: () => {
        for (const g of gs) retireGarment(g.item.id, false)
      },
    },
  })
}

/** Deleted to Recently deleted (ADR-0032; WRD-010 3, WRD-012 3), with Undo. */
export function deleteGarments(gs: readonly GarmentView[], leaving = 0) {
  for (const g of gs) archiveItem(g.item.id)
  const outfits =
    leaving === 1 ? ', leaving 1 outfit' : leaving > 1 ? `, leaving ${leaving} outfits` : ''
  toast(`Deleted ${what(gs)}${outfits}`, {
    action: {
      label: 'Undo',
      onClick: () => {
        for (const g of gs) restoreItem(g.item.id)
      },
    },
  })
}
