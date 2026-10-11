import { useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from '@/components/ui/sonner'
import { archiveItem, restoreItem, type Item } from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { itemTitle, opensAsPage } from '@/lib/item-types'

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** The Item popup was opened by going forward, so closing it goes back. */
    itemOpened?: boolean
  }
}

/**
 * Opens an Item where its Type opens (ITM-001, patterns.md#opening-an-item):
 * a popup over this page, or a page of its own. Either way it has its own
 * entry in the history, so Back returns here.
 */
export function useOpenItem() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  return (item: Pick<Item, 'id' | 'type'>) => {
    if (opensAsPage(item.type, isMobile)) {
      void navigate({ to: '/item/$id', params: { id: item.id } })
    } else {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, item: item.id }),
        state: { itemOpened: true },
      })
    }
  }
}

/** Closes the Item popup, back to the page as it was. */
export function useCloseItem() {
  const navigate = useNavigate()
  const router = useRouter()
  const location = useLocation()
  return () => {
    if (location.state.itemOpened) router.history.back()
    else void navigate({ to: '.', search: (prev) => ({ ...prev, item: undefined }), replace: true })
  }
}

/** Deletes at once, with Undo (ITM-002); it stays in Recently deleted (ITM-003). */
export function deleteItem(item: Item) {
  archiveItem(item.id)
  toast(`Deleted "${itemTitle(item)}"`, {
    action: { label: 'Undo', onClick: () => restoreItem(item.id) },
  })
}
